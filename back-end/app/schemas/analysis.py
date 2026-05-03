from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BoundingBoxResponse(BaseModel):
    x: float
    y: float
    width: float
    height: float

    model_config = ConfigDict(populate_by_name=True)


class ScanUploadResponse(BaseModel):
    id: str
    file_name: str = Field(..., alias="fileName")
    file_type: str = Field(..., alias="fileType")
    file_size: int = Field(..., alias="fileSize")
    upload_status: str = Field(..., alias="uploadStatus")
    analysis_status: str = Field(..., alias="analysisStatus")
    image_url: str | None = Field(None, alias="imageUrl")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class CreateAnalysisRequest(BaseModel):
    scan_id: str = Field(
        ...,
        validation_alias="scanId",
        serialization_alias="scanId",
        min_length=1,
    )

    model_config = ConfigDict(populate_by_name=True)


class AnalysisResponse(BaseModel):
    id: str
    scan_id: str = Field(..., alias="scanId")
    file_name: str = Field(..., alias="fileName")
    file_type: str = Field(..., alias="fileType")
    image_url: str | None = Field(None, alias="imageUrl")
    result: str
    confidence: float
    tumor_detected: bool | None = Field(None, alias="tumorDetected")
    tumor_type: str | None = Field(None, alias="tumorType")
    tumor_location: str | None = Field(None, alias="tumorLocation")
    tumor_volume: str | None = Field(None, alias="tumorVolume")
    bounding_box: BoundingBoxResponse | None = Field(None, alias="boundingBox")
    report_text: str | None = Field(None, alias="reportText")
    model_version: str | None = Field(None, alias="modelVersion")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)