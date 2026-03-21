'use strict';

/**
 * Hybrid Decision Engine
 * Combines rule-based classification with ML-based classification
 * Resolves conflicts and produces final classification decision
 */
class HybridDecisionEngine {
  constructor() {
    this.decisionLog = [];
    this.conflictThreshold = 0.15; // If scores differ by more than 15%, it's a conflict
  }

  /**
   * Make final decision by combining rule-based, ML, and HuggingFace results
   * @param {Object} ruleBased - Rule-based classification result
   * @param {Object} mlBased - ML-based classification result
   * @param {Object} huggingface - HuggingFace classification result
   * @returns {Object} Hybrid decision result
   */
  makeDecision(ruleBased, mlBased, huggingface) {
    const decision = {
      ruleBased: ruleBased,
      mlBased: mlBased,
      huggingface: huggingface,
      finalCategory: null,
      finalConfidence: 0,
      allLabels: [],
      conflictDetected: false,
      conflictStrategy: null,
      requiresManualReview: false
    };

    // Collect all available predictions
    const predictions = [];
    if (ruleBased) predictions.push({ source: 'rule_based', category: ruleBased.category, confidence: ruleBased.confidence });
    if (mlBased && mlBased.confidence >= 0.3) predictions.push({ source: 'ml_based', category: mlBased.labels?.[0], confidence: mlBased.confidence });
    if (huggingface) predictions.push({ source: 'huggingface', category: huggingface.category, confidence: huggingface.confidence });

    if (predictions.length === 0) {
      return this._decideWithoutML(decision, ruleBased);
    }

    // Find majority vote
    const categoryVotes = {};
    predictions.forEach(p => {
      if (!categoryVotes[p.category]) categoryVotes[p.category] = [];
      categoryVotes[p.category].push(p);
    });

    const maxVotes = Math.max(...Object.values(categoryVotes).map(v => v.length));
    const topCategories = Object.entries(categoryVotes)
      .filter(([_, votes]) => votes.length === maxVotes)
      .map(([cat, votes]) => {
        const avgConfidence = votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;
        return { category: cat, votes: votes.length, avgConfidence, sources: votes.map(v => v.source) };
      })
      .sort((a, b) => b.avgConfidence - a.avgConfidence);

    if (topCategories.length > 0) {
      const winner = topCategories[0];
      decision.finalCategory = winner.category;
      decision.finalConfidence = Math.min(winner.avgConfidence * (winner.votes / predictions.length), 0.99);
      decision.allLabels = topCategories.map(t => ({ label: t.category, confidence: t.avgConfidence, sources: t.sources }));
      
      if (winner.votes < predictions.length) {
        decision.conflictDetected = true;
        decision.conflictStrategy = `Majority vote (${winner.votes}/${predictions.length}) with averaged confidence`;
      }
    }

    decision.requiresManualReview = decision.finalConfidence < 0.6 && decision.conflictDetected;
    return decision;
  }

  /**
   * Decision when rule-based only
   */
  _decideWithoutML(decision, ruleBased) {
    decision.finalCategory = ruleBased.category;
    decision.finalConfidence = ruleBased.confidence;
    decision.allLabels = [ruleBased.category];
    decision.conflictStrategy = 'rule-based-only';
    return decision;
  }

  /**
   * Decision when ML only
   */
  _decideWithoutRuleBased(decision, mlBased) {
    decision.finalCategory = mlBased.labels?.[0] || 'other';
    decision.finalConfidence = mlBased.confidence;
    decision.allLabels = mlBased.labels || ['other'];
    decision.conflictStrategy = 'ml-only';
    if (mlBased.confidence < 0.6) {
      decision.requiresManualReview = true;
    }
    return decision;
  }

  /**
   * Decision when both agree
   */
  _decideOnAgreement(decision, ruleBased, mlBased) {
    decision.conflictDetected = false;
    decision.finalCategory = ruleBased.category;
    
    // Combine confidences (weighted average)
    const combinedConfidence = (ruleBased.confidence * 0.6) + (mlBased.confidence * 0.4);
    decision.finalConfidence = Math.min(combinedConfidence * 1.1, 0.99); // Boost confidence on agreement
    
    decision.allLabels = [ruleBased.category];
    if (mlBased.labels?.[1]) {
      decision.allLabels.push(mlBased.labels[1]);
    }
    
    decision.conflictStrategy = 'agreement-high-confidence';
    return decision;
  }

  /**
   * Decision when results conflict
   */
  _decideOnConflict(decision, ruleBased, mlBased) {
    decision.conflictDetected = true;
    
    const ruleConfidence = ruleBased.confidence;
    const mlConfidence = mlBased.confidence;
    
    // Strategy 1: Choose higher confidence result
    if (ruleConfidence > mlConfidence + 0.1) {
      decision.finalCategory = ruleBased.category;
      decision.finalConfidence = ruleConfidence * 0.8; // Reduce confidence due to conflict
      decision.conflictStrategy = 'rule-based-higher-confidence';
    } else if (mlConfidence > ruleConfidence + 0.1) {
      decision.finalCategory = mlBased.labels?.[0];
      decision.finalConfidence = mlConfidence * 0.8;
      decision.conflictStrategy = 'ml-higher-confidence';
    } else {
      // Similar confidence: blend them
      decision.finalCategory = ruleBased.category; // Default to rule-based
      decision.finalConfidence = Math.max(ruleConfidence, mlConfidence) * 0.7;
      decision.conflictStrategy = 'confidence-equal-fallback-rule';
      decision.requiresManualReview = true; // Mark for review
    }
    
    // Add alternative labels
    decision.allLabels = [decision.finalCategory];
    if (mlBased.labels?.[0] !== decision.finalCategory) {
      decision.allLabels.push(mlBased.labels?.[0]);
    }
    
    return decision;
  }

  /**
   * Severity calibration: prevent emotion from inflating priority
   * @param {Object} classification - Classification result
   * @param {string} priority - Detected priority
   * @param {string} sentiment - Detected sentiment
   * @returns {Object} Calibrated priority and recommendation
   */
  calibrateSeverity(classification, priority, sentiment) {
    const result = {
      originalPriority: priority,
      calibratedPriority: priority,
      recommendation: null,
      adjustmentReason: null
    };

    // Count emotional words
    const emotionalWords = ['pathetic', 'disgusting', 'terrible', 'worst', 'corrupt', 'useless', 'angry', 'frustrated'];
    const text = (classification.text || '').toLowerCase();
    const emotionalCount = emotionalWords.filter(w => text.includes(w)).length;

    // Check for emergency keywords
    const emergencyKeywords = ['emergency', 'urgent', 'dangerous', 'life threatening', 'accident', 'death', 'collapse', 'explosion', 'fire', 'flood', 'electric shock'];
    const hasEmergency = emergencyKeywords.some(kw => text.includes(kw));

    // If high emotion but no emergency: cap at MEDIUM
    if (emotionalCount > 2 && !hasEmergency && priority === 'high') {
      result.calibratedPriority = 'medium';
      result.adjustmentReason = 'Emotional language detected but no emergency keywords';
      result.recommendation = 'Verify urgency with citizen before escalating';
    }

    // If emergency keywords: ensure at least HIGH
    if (hasEmergency && (priority === 'low' || priority === 'medium')) {
      result.calibratedPriority = 'high';
      result.adjustmentReason = 'Emergency keywords detected';
      result.recommendation = 'Escalate to duty officer';
    }

    return result;
  }

  /**
   * Multi-label support decision
   */
  decideMultiLabel(ruleBased, mlBased, huggingface, confidenceThreshold = 0.65) {
    const labels = new Set();

    // Add rule-based category
    if (ruleBased && ruleBased.category) {
      labels.add(ruleBased.category);
    }

    // Add ML labels if confident
    if (mlBased && Array.isArray(mlBased.labels)) {
      for (const label of mlBased.labels) {
        const categoryScore = mlBased.scores?.[label] || 0;
        if (categoryScore > confidenceThreshold) {
          labels.add(label);
        }
      }
    }

    // Add HuggingFace category if confident
    if (huggingface && huggingface.category && huggingface.confidence > confidenceThreshold) {
      labels.add(huggingface.category);
    }

    return {
      labels: Array.from(labels),
      multiLabel: labels.size > 1,
      labelConfidences: {
        rule_based: ruleBased?.category ? ruleBased.confidence : 0,
        ml_based: mlBased?.confidence || 0,
        huggingface: huggingface?.confidence || 0
      }
    };
  }

  /**
   * Log decision for audit trail
   */
  logDecision(complaintId, decision, geminiResult = null) {
    const log = {
      timestamp: new Date().toISOString(),
      complaintId,
      ruleBased: decision.ruleBased?.category,
      mlBased: decision.mlBased?.labels?.[0],
      final: decision.finalCategory,
      confidence: decision.finalConfidence,
      conflict: decision.conflictDetected,
      geminiUsed: !!geminiResult,
      geminiAdjusted: geminiResult?.adjusted || false
    };

    this.decisionLog.push(log);
    
    // Keep last 1000 decisions in memory
    if (this.decisionLog.length > 1000) {
      this.decisionLog.shift();
    }

    return log;
  }

  /**
   * Get decision statistics
   */
  getStats() {
    if (this.decisionLog.length === 0) {
      return { totalDecisions: 0, conflicts: 0, geminiUsed: 0 };
    }

    const conflicts = this.decisionLog.filter(d => d.conflict).length;
    const geminiUsed = this.decisionLog.filter(d => d.geminiUsed).length;
    const avgConfidence = this.decisionLog.reduce((sum, d) => sum + d.confidence, 0) / this.decisionLog.length;

    return {
      totalDecisions: this.decisionLog.length,
      conflicts,
      conflictRate: ((conflicts / this.decisionLog.length) * 100).toFixed(2) + '%',
      geminiUsed,
      geminiAdjusted: this.decisionLog.filter(d => d.geminiAdjusted).length,
      avgConfidence: avgConfidence.toFixed(4)
    };
  }
}

module.exports = new HybridDecisionEngine();
