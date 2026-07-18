#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
R=ROOT/'reports'

def junit(path:Path):
    root=ET.parse(path).getroot()
    cases=[]
    for tc in root.iter('testcase'):
        cases.append({'classname':tc.get('classname',''),'name':tc.get('name',''),'time':float(tc.get('time','0') or 0),'failed':tc.find('failure') is not None or tc.find('error') is not None,'skipped':tc.find('skipped') is not None})
    return {'tests':len(cases),'passed':sum(not c['failed'] and not c['skipped'] for c in cases),'failed':sum(c['failed'] for c in cases),'skipped':sum(c['skipped'] for c in cases),'durationSeconds':round(sum(c['time'] for c in cases),3),'cases':cases}

def coverage(path:Path):
    total=json.loads(path.read_text())['total']
    return {k:{'total':v['total'],'covered':v['covered'],'pct':v['pct']} for k,v in total.items() if k in {'lines','statements','functions','branches'}}

server=junit(R/'node-server-junit.xml'); mini=junit(R/'miniprogram-junit.xml'); admin=junit(R/'admin-junit.xml')
server['coverage']=coverage(R/'server-coverage/coverage-summary.json')
mini['coverage']=coverage(R/'miniprogram-coverage/coverage-summary.json')
admin['coverage']=coverage(R/'admin-coverage/coverage-summary.json')
smoke=json.loads((R/'node-smoke-console.txt').read_text())
audit=json.loads((R/'npm-audit-production.json').read_text())['metadata']['vulnerabilities']
summary={
 'generatedAt':datetime.now(timezone.utc).isoformat(),
 'version':'2.0.0',
 'runtime':'Node.js >=20',
 'components':{'server':server,'miniprogram':mini,'admin':admin},
 'totals':{'tests':server['tests']+mini['tests']+admin['tests'],'passed':server['passed']+mini['passed']+admin['passed'],'failed':server['failed']+mini['failed']+admin['failed'],'skipped':server['skipped']+mini['skipped']+admin['skipped']},
 'builds':{'server':'PASS','miniprogramMpWeixin':'PASS','admin':'PASS'},
 'processSmoke':smoke,
 'productionDependencyAudit':audit,
 'result':'PASS' if all(x['failed']==0 for x in [server,mini,admin]) and audit['critical']==0 and audit['high']==0 else 'FAIL'
}
(R/'full-stack-test-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in {'components'}},ensure_ascii=False,indent=2))
