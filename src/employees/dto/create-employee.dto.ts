import { IsString, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';
export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
