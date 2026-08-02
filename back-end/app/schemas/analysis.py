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
    preview_image_data: str | None = Field(None, alias="previewImageData")
    latest_analysis_id: str | None = Field(None, alias="latestAnalysisId")
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


class PositiveSliceResponse(BaseModel):
    image_data: str = Field(..., alias="imageData")
    file_name: str = Field(..., alias="fileName")
    confidence: float
    tumor_type: str | None = Field(None, alias="tumorType")
    tumor_location: str | None = Field(None, alias="tumorLocation")
    bounding_box: BoundingBoxResponse | None = Field(None, alias="boundingBox")
    slice_position: str | None = Field(None, alias="slicePosition")

    model_config = ConfigDict(populate_by_name=True)


class ExamSliceResponse(BaseModel):
    slice_number: int = Field(..., alias="sliceNumber")
    image_data: str = Field(..., alias="imageData")
    is_suspicious: bool = Field(..., alias="isSuspicious")
    confidence: float | None = None
    bounding_box: BoundingBoxResponse | None = Field(None, alias="boundingBox")
    tumor_type: str | None = Field(None, alias="tumorType")

    model_config = ConfigDict(populate_by_name=True)


class ExamSeriesResponse(BaseModel):
    series_uid: str = Field(..., alias="seriesUid")
    series_label: str = Field(..., alias="seriesLabel")
    series_number: int = Field(..., alias="seriesNumber")
    total_slices: int = Field(..., alias="totalSlices")
    is_positive: bool = Field(..., alias="isPositive")
    tumor_type: str | None = Field(None, alias="tumorType")
    confidence: float
    all_slices: list[ExamSliceResponse] = Field(default_factory=list, alias="allSlices")

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
    positive_slices: list[PositiveSliceResponse] = Field(default_factory=list, alias="positiveSlices")
    preview_image_data: str | None = Field(None, alias="previewImageData")
    is_full_exam: bool = Field(False, alias="isFullExam")
    exam_series: list[ExamSeriesResponse] | None = Field(None, alias="examSeries")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)