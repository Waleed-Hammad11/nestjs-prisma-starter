import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';

const mockEmployee = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: Role.ENGINEER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  employee: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('EmployeesService', () => {
  let service: EmployeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new employee', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        role: Role.ENGINEER,
      };
      mockPrismaService.employee.create.mockResolvedValue(mockEmployee);

      const result = await service.create(dto);
      expect(result).toEqual(mockEmployee);
      expect(mockPrismaService.employee.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('findAll', () => {
    it('should return a list of employees', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([mockEmployee]);

      const result = await service.findAll();
      expect(result).toEqual([mockEmployee]);
      expect(mockPrismaService.employee.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single employee if found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);

      const result = await service.findOne(1);
      expect(result).toEqual(mockEmployee);
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.employee.findUnique).toHaveBeenCalledWith({
        where: { id: 99 },
      });
    });
  });

  describe('update', () => {
    it('should update an existing employee', async () => {
      const dto = { name: 'John Updated' };
      const updatedEmployee = { ...mockEmployee, ...dto };
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.employee.update.mockResolvedValue(updatedEmployee);

      const result = await service.update(1, dto);
      expect(result).toEqual(updatedEmployee);
      expect(mockPrismaService.employee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
    });

    it('should throw NotFoundException if employee to update not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Name' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.employee.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing employee', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.employee.delete.mockResolvedValue(mockEmployee);

      const result = await service.remove(1);
      expect(result).toEqual(mockEmployee);
      expect(mockPrismaService.employee.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if employee to delete not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.employee.delete).not.toHaveBeenCalled();
    });
  });
});
