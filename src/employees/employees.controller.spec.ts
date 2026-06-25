import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Role } from '../../generated/prisma/enums';

const mockEmployee = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: Role.ENGINEER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEmployeesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('EmployeesController', () => {
  let controller: EmployeesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return the result', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        role: Role.ENGINEER,
      };
      mockEmployeesService.create.mockResolvedValue(mockEmployee);

      const result = await controller.create(dto);
      expect(result).toEqual(mockEmployee);
      expect(mockEmployeesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return a list of employees', async () => {
      mockEmployeesService.findAll.mockResolvedValue([mockEmployee]);

      const result = await controller.findAll();
      expect(result).toEqual([mockEmployee]);
      expect(mockEmployeesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return a single employee', async () => {
      mockEmployeesService.findOne.mockResolvedValue(mockEmployee);

      const result = await controller.findOne(1);
      expect(result).toEqual(mockEmployee);
      expect(mockEmployeesService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call service.update and return the updated employee', async () => {
      const dto = { name: 'John Updated' };
      const updatedEmployee = { ...mockEmployee, ...dto };
      mockEmployeesService.update.mockResolvedValue(updatedEmployee);

      const result = await controller.update(1, dto);
      expect(result).toEqual(updatedEmployee);
      expect(mockEmployeesService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return the deleted employee', async () => {
      mockEmployeesService.remove.mockResolvedValue(mockEmployee);

      const result = await controller.remove(1);
      expect(result).toEqual(mockEmployee);
      expect(mockEmployeesService.remove).toHaveBeenCalledWith(1);
    });
  });
});
