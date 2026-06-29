import { Prisma } from '../../../generated/prisma/client';
import { EMPLOYEE_SELECT } from '../constants/employee.constants';

export type CleanEmployee = Prisma.EmployeeGetPayload<{
  select: typeof EMPLOYEE_SELECT;
}>;
