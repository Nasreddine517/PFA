from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DashboardAnalysisSummary(BaseModel):
    id: str
    result: str
    confidence: float
    created_at: datetime = Field(..., alias="createdAt")

    model_config = ConfigDict(populate_by_name=True)


class DashboardStatsResponse(BaseModel):
    total_scans: int = Field(..., alias="totalScans")
    positive_scans: int = Field(..., alias="positiveScans")
    negative_scans: int = Field(..., alias="negativeScans")
    avg_confidence: float = Field(..., alias="avgConfidence")
    analyses: list[DashboardAnalysisSummary]

    model_config = ConfigDict(populate_by_name=True)