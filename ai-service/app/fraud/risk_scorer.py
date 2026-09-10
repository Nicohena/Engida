"""Risk scoring and aggregation"""
from typing import List, Dict, Any
from app.schemas.risk import RiskFlag, RiskLevel


class RiskScorer:
    """
    Aggregates multiple signals into overall risk score.
    """
    
    def calculate_composite_risk(
        self,
        ml_score: float,
        rule_flags: List[RiskFlag],
        historical_score: float = 0.0
    ) -> Dict[str, Any]:
        """
        Combine ML score, rule-based flags, and historical data
        into composite risk assessment.
        """
        # Weight different signals
        weights = {
            "ml": 0.5,
            "rules": 0.3,
            "historical": 0.2,
        }
        
        # Calculate rule score from flags
        rule_score = self._flags_to_score(rule_flags)
        
        # Weighted combination
        composite_score = (
            weights["ml"] * ml_score +
            weights["rules"] * rule_score +
            weights["historical"] * historical_score
        )
        
        risk_level = self._score_to_level(composite_score)
        
        return {
            "risk_score": composite_score,
            "risk_level": risk_level,
            "flags": rule_flags,
            "confidence": self._calculate_confidence(ml_score, rule_score),
        }
    
    def _flags_to_score(self, flags: List[RiskFlag]) -> float:
        """Convert risk flags to numerical score"""
        if not flags:
            return 0.0
        
        severity_scores = {
            RiskLevel.LOW: 0.25,
            RiskLevel.MEDIUM: 0.5,
            RiskLevel.HIGH: 0.75,
            RiskLevel.CRITICAL: 1.0,
        }
        
        total = sum(severity_scores.get(flag.severity, 0) for flag in flags)
        return min(total / len(flags), 1.0)
    
    def _score_to_level(self, score: float) -> RiskLevel:
        """Convert numerical score to risk level"""
        if score < 0.25:
            return RiskLevel.LOW
        elif score < 0.5:
            return RiskLevel.MEDIUM
        elif score < 0.75:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _calculate_confidence(self, ml_score: float, rule_score: float) -> float:
        """Calculate confidence in risk assessment"""
        # Higher confidence when ML and rules agree
        agreement = 1 - abs(ml_score - rule_score)
        return agreement
