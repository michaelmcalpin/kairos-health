import ExpoModulesCore
import HealthKit

/// Generic, read-only Apple Health access for Everist.
///
/// Every call takes a HealthKit identifier string, so new metrics are added in
/// JavaScript (mobile/lib/health/metrics.ts) without touching native code.
/// Identifiers this iOS version doesn't know are skipped, never crash.
/// Errors (no permission, no data) resolve to empty results: Apple does not let
/// apps tell "denied" apart from "no data" for reads.
public class EveristHealthKitModule: Module {
  private let store = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("EveristHealthKit")

    Function("isAvailable") { () -> Bool in
      return HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestAuthorization") { (quantity: [String], category: [String], promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      var types = Set<HKObjectType>()
      for id in quantity {
        if let t = HKObjectType.quantityType(forIdentifier: HKQuantityTypeIdentifier(rawValue: id)) { types.insert(t) }
      }
      for id in category {
        if let t = HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier(rawValue: id)) { types.insert(t) }
      }
      types.insert(HKObjectType.workoutType())
      // Present Apple's permission sheet from the main thread. Expo runs async
      // functions on a background queue; asking from there right after another
      // sheet closed could leave the request hanging with no sheet shown.
      DispatchQueue.main.async {
        self.store.requestAuthorization(toShare: nil, read: types) { ok, error in
          if let error = error {
            promise.reject("E_HEALTHKIT_AUTH", error.localizedDescription)
            return
          }
          promise.resolve(ok)
        }
      }
    }

    /// One value per local calendar day: [{ date: "YYYY-MM-DD", value }].
    /// Cumulative types (steps, calories…) are summed with Apple's own
    /// de-duplication across iPhone + Watch; discrete types use `agg`.
    AsyncFunction("dailyStatistics") { (identifier: String, unitName: String, agg: String, startMs: Double, endMs: Double, promise: Promise) in
      guard
        let type = HKObjectType.quantityType(forIdentifier: HKQuantityTypeIdentifier(rawValue: identifier)),
        let unit = EveristHealthKitModule.unitFor(unitName),
        type.is(compatibleWith: unit)
      else {
        promise.resolve([[String: Any]]())
        return
      }

      let start = Date(timeIntervalSince1970: startMs / 1000)
      let end = Date(timeIntervalSince1970: endMs / 1000)
      let anchor = Calendar.current.startOfDay(for: start)
      let cumulative = type.aggregationStyle == .cumulative

      var options: HKStatisticsOptions
      if cumulative {
        options = .cumulativeSum
      } else {
        switch agg {
        case "min": options = .discreteMin
        case "max": options = .discreteMax
        case "latest": options = .mostRecent
        default: options = .discreteAverage
        }
      }

      let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
      let query = HKStatisticsCollectionQuery(
        quantityType: type,
        quantitySamplePredicate: predicate,
        options: options,
        anchorDate: anchor,
        intervalComponents: DateComponents(day: 1)
      )
      query.initialResultsHandler = { _, results, error in
        guard error == nil, let results = results else {
          promise.resolve([[String: Any]]())
          return
        }
        var out: [[String: Any]] = []
        results.enumerateStatistics(from: start, to: end) { stat, _ in
          var quantity: HKQuantity?
          if cumulative {
            quantity = stat.sumQuantity()
          } else {
            switch agg {
            case "min": quantity = stat.minimumQuantity()
            case "max": quantity = stat.maximumQuantity()
            case "latest": quantity = stat.mostRecentQuantity()
            default: quantity = stat.averageQuantity()
            }
          }
          if let quantity = quantity {
            out.append([
              "date": EveristHealthKitModule.dayString(stat.startDate),
              "value": quantity.doubleValue(for: unit),
            ])
          }
        }
        promise.resolve(out)
      }
      self.store.execute(query)
    }

    /// Raw category samples (sleep stages, mindful sessions, heart alerts, cycle…).
    AsyncFunction("categorySamples") { (identifier: String, startMs: Double, endMs: Double, limit: Int, promise: Promise) in
      guard let type = HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier(rawValue: identifier)) else {
        promise.resolve([[String: Any]]())
        return
      }
      let predicate = HKQuery.predicateForSamples(
        withStart: Date(timeIntervalSince1970: startMs / 1000),
        end: Date(timeIntervalSince1970: endMs / 1000),
        options: []
      )
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
      let query = HKSampleQuery(
        sampleType: type,
        predicate: predicate,
        limit: limit > 0 ? limit : HKObjectQueryNoLimit,
        sortDescriptors: [sort]
      ) { _, samples, _ in
        let out: [[String: Any]] = (samples as? [HKCategorySample] ?? []).map { s in
          [
            "start": s.startDate.timeIntervalSince1970 * 1000,
            "end": s.endDate.timeIntervalSince1970 * 1000,
            "value": s.value,
            "source": s.sourceRevision.source.name,
            "sourceId": s.sourceRevision.source.bundleIdentifier,
          ]
        }
        promise.resolve(out)
      }
      self.store.execute(query)
    }

    /// Recorded workouts, newest first.
    AsyncFunction("workouts") { (startMs: Double, endMs: Double, limit: Int, promise: Promise) in
      let predicate = HKQuery.predicateForSamples(
        withStart: Date(timeIntervalSince1970: startMs / 1000),
        end: Date(timeIntervalSince1970: endMs / 1000),
        options: []
      )
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
      let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate,
        limit: limit > 0 ? limit : HKObjectQueryNoLimit,
        sortDescriptors: [sort]
      ) { _, samples, _ in
        var out: [[String: Any]] = []
        for w in (samples as? [HKWorkout] ?? []) {
          var d: [String: Any] = [
            "id": w.uuid.uuidString,
            "activityType": Int(w.workoutActivityType.rawValue),
            "start": w.startDate.timeIntervalSince1970 * 1000,
            "end": w.endDate.timeIntervalSince1970 * 1000,
            "durationMin": w.duration / 60.0,
            "source": w.sourceRevision.source.name,
          ]
          let bpm = HKUnit.count().unitDivided(by: HKUnit.minute())
          if #available(iOS 16.0, *) {
            if let e = w.statistics(for: HKQuantityType(.activeEnergyBurned))?.sumQuantity() {
              d["energyKcal"] = e.doubleValue(for: .kilocalorie())
            }
            let hr = w.statistics(for: HKQuantityType(.heartRate))
            if let a = hr?.averageQuantity() { d["avgHr"] = a.doubleValue(for: bpm) }
            if let m = hr?.maximumQuantity() { d["maxHr"] = m.doubleValue(for: bpm) }
            let distanceTypes: [HKQuantityTypeIdentifier] = [.distanceWalkingRunning, .distanceCycling, .distanceSwimming]
            for id in distanceTypes {
              if let q = w.statistics(for: HKQuantityType(id))?.sumQuantity() {
                d["distanceM"] = q.doubleValue(for: .meter())
                break
              }
            }
          } else {
            if let e = w.totalEnergyBurned { d["energyKcal"] = e.doubleValue(for: .kilocalorie()) }
            if let dist = w.totalDistance { d["distanceM"] = dist.doubleValue(for: .meter()) }
          }
          out.append(d)
        }
        promise.resolve(out)
      }
      self.store.execute(query)
    }
  }

  // MARK: - Helpers

  private static let dayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone.current
    f.dateFormat = "yyyy-MM-dd"
    return f
  }()

  static func dayString(_ date: Date) -> String {
    return dayFormatter.string(from: date)
  }

  /// Units are built here instead of parsed from strings: HKUnit(from:) raises an
  /// Objective-C exception on a bad string, which Swift cannot catch.
  static func unitFor(_ name: String) -> HKUnit? {
    let bpm = HKUnit.count().unitDivided(by: HKUnit.minute())
    switch name {
    case "count": return HKUnit.count()
    case "m": return HKUnit.meter()
    case "cm": return HKUnit.meterUnit(with: .centi)
    case "in": return HKUnit.inch()
    case "kcal": return HKUnit.kilocalorie()
    case "min": return HKUnit.minute()
    case "bpm", "count/min": return bpm
    case "ms": return HKUnit.secondUnit(with: .milli)
    case "%": return HKUnit.percent()
    case "vo2":
      return HKUnit.literUnit(with: .milli).unitDivided(by: HKUnit.gramUnit(with: .kilo).unitMultiplied(by: HKUnit.minute()))
    case "degF": return HKUnit.degreeFahrenheit()
    case "degC": return HKUnit.degreeCelsius()
    case "mmHg": return HKUnit.millimeterOfMercury()
    case "mg/dL": return HKUnit.gramUnit(with: .milli).unitDivided(by: HKUnit.literUnit(with: .deci))
    case "lb": return HKUnit.pound()
    case "m/s": return HKUnit.meter().unitDivided(by: HKUnit.second())
    case "g": return HKUnit.gram()
    case "mg": return HKUnit.gramUnit(with: .milli)
    case "mcg": return HKUnit.gramUnit(with: .micro)
    case "mL": return HKUnit.literUnit(with: .milli)
    case "L": return HKUnit.liter()
    case "L/min": return HKUnit.liter().unitDivided(by: HKUnit.minute())
    case "dBASPL": return HKUnit.decibelAWeightedSoundPressureLevel()
    case "IU": return HKUnit.internationalUnit()
    case "uS": return HKUnit.siemenUnit(with: .micro)
    case "W":
      if #available(iOS 16.0, *) { return HKUnit.watt() }
      return nil
    default: return nil
    }
  }
}
