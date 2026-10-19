import csv
import random
from datetime import datetime, timedelta

buildings = [
    {"name": "Engineering Hall", "faculty": "Engineering", "meter": "MTR-ENG-01", "base_kwh": 380, "var": 90, "cost_rate": 0.14},
    {"name": "Science Center", "faculty": "Natural Sciences", "meter": "MTR-SCI-01", "base_kwh": 460, "var": 110, "cost_rate": 0.14},
    {"name": "Main Library", "faculty": "Academic Services", "meter": "MTR-LIB-01", "base_kwh": 220, "var": 60, "cost_rate": 0.13},
    {"name": "Student Union", "faculty": "Student Affairs", "meter": "MTR-STU-01", "base_kwh": 310, "var": 75, "cost_rate": 0.13},
    {"name": "North Dormitory", "faculty": "Residential Life", "meter": "MTR-RES-01", "base_kwh": 180, "var": 45, "cost_rate": 0.12},
    {"name": "Athletics Complex", "faculty": "Athletics", "meter": "MTR-ATH-01", "base_kwh": 290, "var": 80, "cost_rate": 0.13},
]

weathers = ["Sunny", "Rainy", "Cloudy", "Overcast", "Windy"]
start_date = datetime(2026, 9, 1)

rows = []
random.seed(42)

for day in range(30):  # 30 days of September 2026
    current_day = start_date + timedelta(days=day)
    date_str = current_day.strftime("%Y-%m-%d")
    is_weekend = current_day.weekday() >= 5
    weather = random.choice(weathers)

    # 2 readings per day: Daytime peak (14:00) and Night baseline (02:00)
    for hour, period in [(14, "Peak"), (2, "Off-Peak")]:
        timestamp_str = f"{date_str} {hour:02d}:00:00"

        for b in buildings:
            factor = 1.0
            if is_weekend:
                factor *= 0.65 if b["name"] != "North Dormitory" else 1.25
            if period == "Off-Peak":
                factor *= 0.45
            
            kwh = round((b["base_kwh"] + random.uniform(-b["var"], b["var"])) * factor, 2)
            peak_kw = round(kwh * random.uniform(1.15, 1.35), 2)
            cost = round(kwh * b["cost_rate"], 2)
            occupancy = int(random.uniform(50, 450) * factor) if not is_weekend else int(random.uniform(10, 120))
            if b["name"] == "North Dormitory" and is_weekend:
                occupancy = int(random.uniform(200, 350))

            rows.append({
                "timestamp": timestamp_str,
                "building": b["name"],
                "faculty": b["faculty"],
                "meter_id": b["meter"],
                "kwh_usage": max(10.0, kwh),
                "peak_demand_kw": max(12.0, peak_kw),
                "cost_usd": max(1.5, cost),
                "occupancy": occupancy,
                "period": period,
                "is_weekend": "True" if is_weekend else "False",
                "weather_condition": weather
            })

with open(r"d:\NovaTech\campus-intelligence\backend\data\campus_electricity.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

print(f"Generated {len(rows)} rows of campus electricity data.")

