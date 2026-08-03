import csv

# Check EMP001 audit drop over time
rows = []
with open('processed/daily_activity.csv', newline='') as f:
    for r in csv.DictReader(f):
        if r['employee_id'] == 'EMP001':
            rows.append(r)

print('EMP001 (Rajesh Kumar) - Audit Reports decay over 90 days:')
for r in rows[::10]:
    day   = int(r['day_index'])
    audit = r.get('Audit Reports', '0')
    loan  = r.get('Loan Approval', '0')
    dow   = r['day_of_week'][:3]
    print(f'  Day {day:2d}  Audit={audit:>4}  Loan={loan:>4}  ({dow})')

print()
print('Anomaly Reasons:')
with open('labels/anomaly_reason.csv', newline='') as f:
    for r in csv.DictReader(f):
        print(f"  {r['employee_id']} {r['name']} - {r['strategy']}")
        print(f"    audit_drop={r['audit_drop_pct']}%  sigma={r['peer_sigma']}")
        reasons = r['reasons'].split(' | ')
        for reason in reasons[:2]:
            print(f"    -> {reason[:110]}")
        print()
