import { ConflictException } from '@nestjs/common';
import { RecordStatus } from '@csbms/shared';

export type WorkflowAction = 'edit' | 'submit' | 'verify' | 'return';

/**
 * Record status rules:
 *   DRAFT     --submit-->  SUBMITTED
 *   SUBMITTED --verify-->  VERIFIED
 *   SUBMITTED --return-->  DRAFT
 *   DRAFT / VERIFIED --edit--> DRAFT   (editing a verified record needs a new verification)
 * A SUBMITTED record is locked while it waits for the unit head.
 */
export function nextStatus(current: RecordStatus, action: WorkflowAction): RecordStatus {
  switch (action) {
    case 'edit':
      if (current === RecordStatus.SUBMITTED) {
        throw new ConflictException({
          error: 'RECORD_LOCKED',
          message:
            'This record is waiting for verification. The unit head must return it before you can edit.',
        });
      }
      return RecordStatus.DRAFT;
    case 'submit':
      if (current !== RecordStatus.DRAFT) throw invalid(current, action);
      return RecordStatus.SUBMITTED;
    case 'verify':
    case 'return':
      if (current !== RecordStatus.SUBMITTED) throw invalid(current, action);
      return action === 'verify' ? RecordStatus.VERIFIED : RecordStatus.DRAFT;
  }
}

function invalid(current: RecordStatus, action: WorkflowAction) {
  return new ConflictException({
    error: 'INVALID_STATUS',
    message: `Cannot ${action} a record with status ${current}`,
  });
}
