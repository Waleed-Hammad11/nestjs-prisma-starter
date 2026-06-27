import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma/enums';
export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
