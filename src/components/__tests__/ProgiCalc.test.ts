import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgiCalc from '../ProgiCalc.vue';

describe('ProgiCalc.vue', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('/api/Main/GetStorageFees')) {
        return Promise.resolve({
          json: () => Promise.resolve({ fee_amount: 50 })
        });
      } else if (url.includes('/api/Main/GetAssociationFees')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { price_range_end: 1000, fee_amount: 10 },
            { price_range_end: null, fee_amount: 20 }
          ])
        });
      } else if (url.includes('/api/Main/GetBuyerSellerFees/')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { feeType: 'Basic buyer fee', percentage: 5, min_value: 100, max_value: 500 },
            { feeType: "Seller's special fee", percentage: 2 }
          ])
        });
      } else if (url.includes('/api/Main/GetCarTypes')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { id: 1, typeName: 'Common' },
            { id: 2, typeName: 'Luxury' }
          ])
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    }));
  
    wrapper = mount(ProgiCalc);
  });

  it('renders properly', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('h1').text()).toBe('Car Auction Price Calculator');
  });

  it('fetches initial data on mount', async () => {
    // Wait for next tick and any promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100)); // Increase timeout
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.vehicleTypes).toEqual([
      { id: 1, typeName: 'Common' },
      { id: 2, typeName: 'Luxury' }
    ]);
    expect(wrapper.vm.feeData).toEqual({
      basicBuyerFee: { percentage: 0, min: 0, max: 0 },
      sellerSpecialFee: 0,
      associationFee: [
        { max: 1000, fee: 10 },
        { max: Infinity, fee: 20 }
      ],
      storageFee: 50
    });
  });

  it('calculates fees correctly', async () => {
    wrapper.vm.basePrice = 1000;
    wrapper.vm.vehicleType = 1;
    await wrapper.vm.fetchVehicleTypeData();
    await new Promise(resolve => setTimeout(resolve, 100)); // Increase timeout
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.calculatedFees).toEqual([
      { name: 'Basic Buyer Fee', amount: 100 },
      { name: "Seller's Special Fee", amount: 20 },
      { name: 'Association Fee', amount: 10 },
      { name: 'Storage Fee', amount: 50 }
    ]);
  });

  it('calculates total cost correctly', async () => {
    wrapper.vm.basePrice = 1000;
    wrapper.vm.vehicleType = 1;
    await wrapper.vm.fetchVehicleTypeData();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.totalCost).toBe(1180);
  });

  it('updates fees when base price changes', async () => {
    wrapper.vm.basePrice = 2000;
    wrapper.vm.vehicleType = 1;
    await wrapper.vm.fetchVehicleTypeData();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.calculatedFees).toEqual([
      { name: 'Basic Buyer Fee', amount: 100 },
      { name: "Seller's Special Fee", amount: 40 },
      { name: 'Association Fee', amount: 20 },
      { name: 'Storage Fee', amount: 50 }
    ]);
  });

  it('updates fees when vehicle type changes', async () => {
    wrapper.vm.basePrice = 1000;
    wrapper.vm.vehicleType = 2;
    await wrapper.vm.fetchVehicleTypeData();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.calculatedFees).toEqual([
      { name: 'Basic Buyer Fee', amount: 100 },
      { name: "Seller's Special Fee", amount: 20 },
      { name: 'Association Fee', amount: 10 },
      { name: 'Storage Fee', amount: 50 }
    ]);
  });
});
