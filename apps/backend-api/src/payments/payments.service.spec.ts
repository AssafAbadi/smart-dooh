import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './repositories/payments.repository';
import { ExternalApiConfigService } from '../config/external-api-keys.config';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepo: { findDriverBalance: jest.Mock };

  beforeEach(async () => {
    paymentsRepo = {
      findDriverBalance: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PaymentsRepository,
          useValue: {
            ...paymentsRepo,
            createPayment: jest.fn(),
            updatePayment: jest.fn(),
            findPaymentById: jest.fn(),
            incrementCampaignBudget: jest.fn(),
            countImpressionsByDriverAndPeriod: jest.fn(),
            findDistinctDriverIdsInPeriod: jest.fn(),
            findDriverEarningsByDriverAndPeriod: jest.fn(),
            createDriverEarnings: jest.fn(),
            createPayout: jest.fn(),
            findPayoutsByStatus: jest.fn(),
          },
        },
        {
          provide: ExternalApiConfigService,
          useValue: {
            getStripeSecretKey: jest.fn(() => undefined),
            getStripePublishableKey: jest.fn(() => undefined),
            getStripeWebhookSecret: jest.fn(() => undefined),
            getTranzilaTerminal: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  describe('getDriverBalance', () => {
    it('should return driver balance when driver exists', async () => {
      paymentsRepo.findDriverBalance.mockResolvedValue(12.5);
      const balance = await service.getDriverBalance('driver-1');
      expect(paymentsRepo.findDriverBalance).toHaveBeenCalledWith('driver-1');
      expect(balance).toBe(12.5);
    });

    it('should return 0 when driver does not exist', async () => {
      paymentsRepo.findDriverBalance.mockResolvedValue(0);
      const balance = await service.getDriverBalance('unknown');
      expect(balance).toBe(0);
    });
  });
});
