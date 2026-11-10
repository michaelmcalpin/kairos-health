Pod::Spec.new do |s|
  s.name           = 'EveristHealthKit'
  s.version        = '1.0.0'
  s.summary        = 'Generic Apple Health reads for Everist (daily statistics, category samples, workouts).'
  s.description    = 'Reads any HealthKit quantity or category type by identifier, rolled up per local day.'
  s.author         = 'Everist'
  s.homepage       = 'https://everist.ai'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'HealthKit'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = "**/*.{h,m,swift}"
end
