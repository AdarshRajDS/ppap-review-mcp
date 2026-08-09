/** Shared domain types for the PPAP Review Workbench. */

export type DocumentType =
  | "DRAWING"
  | "ENGINEERING_CHANGE"
  | "PROCESS_FLOW"
  | "PFMEA"
  | "CONTROL_PLAN"
  | "MSA"
  | "DIMENSIONAL_RESULTS"
  | "MATERIAL_RESULTS"
  | "PERFORMANCE_RESULTS"
  | "CAPABILITY_STUDY"
  | "CHECKING_AIDS"
  | "CUSTOMER_REQUIREMENTS"
  | "PSW"
  | "OTHER"
  | "UNKNOWN";

export type DocumentStatus =
  | "PRESENT"
  | "MISSING"
  | "PARTIAL"
  | "NOT_APPLICABLE"
  | "UNABLE_TO_DETERMINE";

export type FindingSeverity =
  | "CRITICAL_REVIEW"
  | "MAJOR_REVIEW"
  | "CLARIFICATION"
  | "OBSERVATION";

export type FindingConfidence = "HIGH" | "MEDIUM" | "LOW";

export type FindingStatus =
  | "OPEN"
  | "AWAITING_SQE"
  | "SQE_CONFIRMED"
  | "FALSE_POSITIVE"
  | "SUPPLIER_CLARIFICATION"
  | "INTERNAL_REVIEW"
  | "NOT_APPLICABLE"
  | "RESOLVED";

export type SqeDecision =
  | "ACCEPT_FINDING"
  | "FALSE_POSITIVE"
  | "SUPPLIER_CLARIFICATION"
  | "INTERNAL_REVIEW"
  | "NOT_APPLICABLE"
  | "RESOLVED";

export type ReviewStatus =
  | "INITIAL_REVIEW"
  | "IN_REVIEW"
  | "SUPPLIER_CLARIFICATION_REQUIRED"
  | "INTERNAL_REVIEW_REQUIRED"
  | "READY_FOR_DISPOSITION"
  | "COMPLETED";

export type ProcessTraceabilityStatus =
  | "MATCHED"
  | "POTENTIAL_GAP"
  | "REVIEW_REQUIRED";

export type CharacteristicTraceabilityStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "REVIEW_REQUIRED";

export type ActorType = "LANGDOCK" | "SQE" | "SYSTEM";

export interface Evidence {
  id: string;
  documentId: string;
  documentName: string;
  label: string;
  value: string;
  page?: number;
  sheet?: string;
  section?: string;
  sourceReference?: string;
  confidence?: FindingConfidence;
}

export interface FindingComment {
  id: string;
  text: string;
  reviewer?: string;
  createdAt: string;
}

export interface PPAPDocument {
  id: string;
  fileName: string;
  type: DocumentType;
  title?: string;
  revision?: string;
  date?: string;
  status: DocumentStatus;
  extractionConfidence?: FindingConfidence;
}

export interface PPAPFinding {
  id: string;
  category: string;
  title: string;
  observation: string;
  preliminarySeverity: FindingSeverity;
  confidence: FindingConfidence;
  status: FindingStatus;
  recommendedNextStep?: string;
  evidence: Evidence[];
  sqeDecision?: SqeDecision;
  comments: FindingComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TraceEvidenceRef {
  present: boolean;
  documentId?: string;
  evidence?: string;
  requirement?: string;
  operation?: string;
  specification?: string;
  gauge?: string;
  result?: string;
}

export interface ProcessTraceability {
  operationId: string;
  operationNumber: string;
  operationName: string;
  processFlow: TraceEvidenceRef;
  pfmea: TraceEvidenceRef;
  controlPlan: TraceEvidenceRef;
  status: ProcessTraceabilityStatus;
}

export interface CharacteristicTraceability {
  id: string;
  name: string;
  drawing: TraceEvidenceRef;
  pfmea: TraceEvidenceRef;
  controlPlan: TraceEvidenceRef;
  dimensional: TraceEvidenceRef;
  msa: TraceEvidenceRef;
  capability: TraceEvidenceRef;
  status: CharacteristicTraceabilityStatus;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorType: ActorType;
  actor?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
}

export interface PPAPCase {
  caseId: string;
  createdAt: string;
  updatedAt: string;
  supplier: {
    name: string;
    supplierId?: string;
    manufacturingLocation?: string;
  };
  part: {
    number: string;
    name: string;
    drawingRevision: string;
    customerPartNumber?: string;
  };
  submission: {
    customer: string;
    reason: string;
    profile: string;
    submissionDate?: string;
    engineeringChangeReference?: string;
  };
  documents: PPAPDocument[];
  findings: PPAPFinding[];
  processTraceability: ProcessTraceability[];
  characteristicTraceability: CharacteristicTraceability[];
  review: {
    status: ReviewStatus;
    reviewer?: string;
    startedAt?: string;
    completedAt?: string;
  };
  auditTrail: AuditEvent[];
}

export interface ReviewSummary {
  caseId: string;
  totalDocuments: number;
  missingDocuments: number;
  missingDocumentIds: string[];
  totalFindings: number;
  unresolvedFindings: number;
  unresolvedFindingIds: string[];
  criticalReviewItems: number;
  criticalReviewFindingIds: string[];
  supplierClarificationFindings: number;
  supplierClarificationFindingIds: string[];
  internalReviewFindings: number;
  internalReviewFindingIds: string[];
  falsePositives: number;
  falsePositiveFindingIds: string[];
  resolvedFindings: number;
  resolvedFindingIds: string[];
  processTraceabilityGaps: number;
  processTraceabilityGapIds: string[];
  characteristicTraceabilityGaps: number;
  characteristicTraceabilityGapIds: string[];
  currentReviewStatus: ReviewStatus;
  suggestedOperationalStatus: ReviewStatus;
}

export class AppError extends Error {
  constructor(
    public readonly code:
      | "CASE_NOT_FOUND"
      | "FINDING_NOT_FOUND"
      | "INVALID_DECISION"
      | "CASE_ALREADY_EXISTS"
      | "VALIDATION_ERROR"
      | "PERSISTENCE_ERROR"
      | "INVALID_STATUS"
      | "EMPTY_COMMENT",
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
