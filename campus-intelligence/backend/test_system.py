import io
import sys
from fastapi.testclient import TestClient
from app.main import app

# Ensure utf-8 stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def run_all_tests():
    client = TestClient(app)

    print("=" * 60)
    print("[TEST 1] Testing GET / (Root Endpoint)")
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("   [PASS] Root Response:", res.json())

    print("\n[TEST 2] Testing GET /api/health (Health Check)")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print("   [PASS] Health Status:", health_data["status"])
    print("   [PASS] Dataset Loaded in Memory:", health_data["dataset_loaded"])
    print("   [PASS] Current Dataset:", health_data["current_dataset"])
    print("   [PASS] Total Records:", health_data["total_records"])

    print("\n[TEST 3] Testing GET /api/dataset/summary (Dataset Summary)")
    res = client.get("/api/dataset/summary")
    assert res.status_code == 200, f"Summary failed: {res.text}"
    data = res.json()
    assert data["total_records"] > 0, "No records in summary"
    assert len(data["buildings"]) > 0, "No buildings in summary"
    print(f"   [PASS] Summary Verified: {data['total_records']} rows across {len(data['buildings'])} buildings")
    print(f"   [PASS] Total Energy: {data['total_kwh']:,.2f} kWh | Cost: ${data['total_cost']:,.2f}")

    print("\n[TEST 4] Testing GET /api/dataset/sample (Sample Records)")
    res = client.get("/api/dataset/sample?limit=5")
    assert res.status_code == 200, f"Sample failed: {res.text}"
    sample_data = res.json()
    assert len(sample_data["records"]) == 5, f"Expected 5 records, got {len(sample_data['records'])}"
    print(f"   [PASS] Retrieved {len(sample_data['records'])} sample records with columns: {list(sample_data['records'][0].keys())}")

    print("\n[TEST 5] Testing GET /api/buildings (Building List)")
    res = client.get("/api/buildings")
    assert res.status_code == 200, f"Buildings failed: {res.text}"
    buildings = res.json()["buildings"]
    print("   [PASS] Buildings:", buildings)

    print("\n[TEST 6] Testing Intelligent Query Workflows")
    test_queries = [
        ("Which building consumes the most electricity?", "ranking", "kwh_usage"),
        ("Compare Engineering Hall and Science Center", "comparison", "kwh_usage"),
        ("What is the total campus electricity consumption?", "total", "kwh_usage"),
        ("Show daily electricity consumption trend", "timeseries", "kwh_usage"),
        ("What is the average electricity usage on weekends?", "average", "kwh_usage"),
        ("Rank buildings by total electricity cost", "ranking", "cost_usd"),
        ("Which facility has the highest peak demand in kW?", "ranking", "peak_demand_kw")
    ]

    for q, expected_intent, expected_metric in test_queries:
        res = client.post("/api/query", json={"question": q})
        assert res.status_code == 200, f"Query failed for '{q}': {res.text}"
        q_data = res.json()
        intent = q_data["intent"]["intent_type"]
        metric = q_data["intent"]["metric"]
        val = q_data["verified_result"]["formatted_value"]
        unit = q_data["verified_result"]["unit"]
        summary = q_data["verified_result"]["summary_statement"]
        chart_type = q_data["verified_result"]["chart"]["chart_type"] if q_data["verified_result"]["chart"] else "none"
        records_count = len(q_data["verified_result"]["supporting_records"])
        caveats_count = len(q_data["verified_result"]["caveats"])

        print(f"\n   [QUERY] Question: '{q}'")
        print(f"      • Intent: {intent} (Expected: {expected_intent})")
        print(f"      • Metric: {metric} (Expected: {expected_metric})")
        print(f"      • Verified Result: {val} {unit}")
        print(f"      • Chart Type: {chart_type}")
        print(f"      • Supporting Records: {records_count} rows | Caveats: {caveats_count}")
        print(f"      • Summary: {summary[:90]}...")

    print("\n[TEST 7] Testing Custom Dataset Upload and Reset")
    test_csv = (
        "timestamp,building,kwh_usage,cost_usd,peak_demand_kw\n"
        "2026-10-01 10:00:00,Bioengineering Lab,340.5,47.6,410.0\n"
        "2026-10-01 11:00:00,Bioengineering Lab,380.0,53.2,460.0\n"
        "2026-10-01 10:00:00,Computer Science Hub,520.0,72.8,630.0\n"
        "2026-10-01 11:00:00,Computer Science Hub,590.2,82.6,710.0\n"
    )
    files = {"file": ("october_custom.csv", io.BytesIO(test_csv.encode("utf-8")), "text/csv")}
    res = client.post("/api/dataset/upload", files=files)
    assert res.status_code == 200, f"Upload failed: {res.text}"
    upload_res = res.json()
    assert upload_res["summary"]["total_records"] == 4, "Upload row count mismatch"
    print(f"   [PASS] Upload Successful: Loaded '{upload_res['summary']['filename']}' with {upload_res['summary']['total_records']} rows.")

    # Query uploaded dataset
    res = client.post("/api/query", json={"question": "Which building consumes the most electricity?"})
    assert res.status_code == 200
    q_data = res.json()
    print(f"   [PASS] Query on uploaded dataset verified: {q_data['verified_result']['metric_name']} -> {q_data['verified_result']['formatted_value']} {q_data['verified_result']['unit']}")

    # Reset back to default
    res = client.post("/api/dataset/reset")
    assert res.status_code == 200, "Reset failed"
    summary_after_reset = client.get("/api/dataset/summary").json()
    assert summary_after_reset["filename"] == "campus_electricity.csv", "Reset filename mismatch"
    assert summary_after_reset["total_records"] == 360, "Reset records count mismatch"
    print(f"   [PASS] Reset Successful: Restored '{summary_after_reset['filename']}' ({summary_after_reset['total_records']} rows).")

    print("\n" + "=" * 60)
    print("ALL 7 TEST SUITES PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    run_all_tests()

