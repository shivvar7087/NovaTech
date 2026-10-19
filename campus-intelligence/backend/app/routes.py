import time
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any, List

from app.schemas import (
    QueryRequest,
    QueryResponse,
    DatasetSummary,
    UploadResponse
)
from app.data_loader import data_loader
from app.analysis_engine import AnalysisEngine
from app.gemma_service import gemma_service

router = APIRouter()

@router.get("/health")
async def health_check():
    ollama_ok = gemma_service.is_ollama_available()
    summary = data_loader.get_summary()
    return {
        "status": "healthy",
        "backend": "FastAPI",
        "ollama_connected": ollama_ok,
        "ollama_model": gemma_service.model_name if ollama_ok else "Not running (using rule engine)",
        "dataset_loaded": summary.total_records > 0,
        "current_dataset": summary.filename,
        "total_records": summary.total_records
    }

@router.get("/dataset/summary", response_model=DatasetSummary)
async def get_dataset_summary():
    return data_loader.get_summary()

@router.get("/dataset/sample")
async def get_dataset_sample(limit: int = 15):
    return {
        "records": data_loader.get_sample_records(limit=limit),
        "filename": data_loader.current_filename
    }

@router.get("/buildings")
async def get_buildings():
    summary = data_loader.get_summary()
    return {"buildings": summary.buildings}

@router.post("/dataset/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        buffer = io.BytesIO(contents)
        success = data_loader.load_from_csv(buffer, filename=file.filename)
        if not success:
            raise HTTPException(status_code=400, detail="Could not parse or validate the uploaded CSV.")

        summary = data_loader.get_summary()
        return UploadResponse(
            status="success",
            message=f"Dataset '{file.filename}' successfully loaded with {summary.total_records} records.",
            summary=summary
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/dataset/reset")
async def reset_dataset():
    data_loader.load_default()
    summary = data_loader.get_summary()
    return {
        "status": "success",
        "message": "Reset to default campus_electricity.csv",
        "summary": summary
    }

@router.post("/query", response_model=QueryResponse)
async def process_query(req: QueryRequest):
    start_time = time.time()
    
    # 1. Fetch current DataFrame & Buildings
    df = data_loader.get_dataframe()
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="No active dataset available.")
    
    summary = data_loader.get_summary()
    available_buildings = summary.buildings

    # 2. Gemma AI Model interprets the question (NO calculation)
    intent, provider_info = gemma_service.interpret_question(
        req.question,
        available_buildings,
        summary.metric_columns,
        summary.primary_metric,
    )

    # Allow manual override if building_filter specified
    if req.building_filter and req.building_filter in available_buildings:
        if req.building_filter not in intent.target_buildings:
            intent.target_buildings.append(req.building_filter)

    # 3. Python Pandas calculates and verifies mathematical results
    verified_result = AnalysisEngine.analyze(df, intent)

    # 4. Gemma synthesizes explanation strictly referencing verified numbers
    explanation, explanation_model = gemma_service.explain_verified_results(req.question, intent, verified_result)

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return QueryResponse(
        question=req.question,
        intent=intent,
        verified_result=verified_result,
        explanation=explanation,
        ai_provider=f"{provider_info} & {explanation_model}",
        processing_time_ms=elapsed_ms
    )

