import openpyxl,sys,json
wb=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)
out={}
ws=wb['Master Gene Database']; rows=list(ws.iter_rows(values_only=True)); hdr=rows[1]
genes=[]
for r in rows[2:]:
  if not r or not r[1]: continue
  genes.append({h:(str(v).strip() if v is not None else None) for h,v in zip(hdr,r)})
out['genes']=genes
q={}
for r in list(wb['Quick Call Reference'].iter_rows(values_only=True))[1:]:
  if r and r[0]: q[str(r[0]).strip()]={'tell':r[1],'supps':r[2],'priority':r[3]}
out['quick']=q
out['peptides']=[dict(zip(['peptide','use','targets','dosing','when'],[str(x) if x else None for x in r[:5]])) for r in list(wb['Peptide Reference'].iter_rows(values_only=True))[1:] if r and r[0]]
json.dump(out,open(sys.argv[2],'w'),indent=1)
print(len(genes),len(q),len(out['peptides']))
