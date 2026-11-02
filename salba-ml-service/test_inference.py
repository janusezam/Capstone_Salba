from app import evaluate_report_v2

test_samples = [
    ('Sunog dako kaayo sa merkado, daghang aso palihug tabang!', 8.1567, 125.1285),
    ('Nagbaha kutob hawak ang tubig sulod sa balay rescue please', 8.1388, 125.1272),
    ('Kusog kaayo ang linog naliki ang bungbong sa balay', 8.1567, 125.1285),
    ('Nidahili ang yuta natabunan ang duha ka balay may naipit', 8.1583, 125.0363),
    ('Kusog nga bagyo nalupad ang atop sa balay', 8.1615, 125.1290),
    ('Massive structural fire with people trapped inside urgent help needed', 8.1567, 125.1285),
    ('River overflowing rapidly chest deep current elderly trapped on roof', 8.1388, 125.1272),
    ('test emergency alert system please ignore this prank', 8.1575, 125.1278),
    ('joke lang walang sunog testing lang', 8.1575, 125.1278),
]

for txt, lat, lng in test_samples:
    res = evaluate_report_v2({'description': txt, 'latitude': lat, 'longitude': lng})
    c = res['classification']
    s = res['severity']
    v = res['verification']
    leg_str = 'legitimate' if v['is_legitimate'] else 'false_alarm'
    print(f"TEXT: {txt}")
    print(f"  Type:       {c['disaster_type']} ({c['confidence']:.3f})")
    print(f"  Severity:   {s['level']} ({s['confidence']:.3f})")
    print(f"  Legitimacy: {leg_str} ({v['confidence']:.3f})")
    print(f"  Action:     {res['overall']['recommendation']}")
    print()
