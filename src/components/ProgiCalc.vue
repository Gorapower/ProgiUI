<script lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

export default {
  name: 'Progi-Calc',
  setup() {
    const basePrice = ref('');
    const vehicleType = ref('');
    const vehicleTypes = ref([]);
    const feeData = ref({
      basicBuyerFee: { percentage: 0, min: 0, max: 0 },
      sellerSpecialFee: 0,
      associationFee: [],
      storageFee: 0
    });

    /**
     * Fetches the storage fees from the server.
     * 
     * @returns {Promise<number>} A promise that resolves to the fee amount.
     */
    const fetchStorageFees = async () => {
      const response = await fetch('/api/Main/GetStorageFees');
      const data = await response.json();
      return data.fee_amount;
    };

    /**
     * Fetches association fees from the server.
     * @returns {Promise<Array<{max: number, fee: number}>>} The association fees.
     */
    const fetchAssociationFees = async () => {
      const response = await fetch('/api/Main/GetAssociationFees');
      const data = await response.json();
      return data.map(fee => ({
        max: fee.price_range_end === null ? Infinity : fee.price_range_end,
        fee: fee.fee_amount
      }));
    };

    /**
     * Fetches the buyer and seller fees for a given car type.
     * 
     * @param {number} carTypeId - The ID of the car type.
     * @returns {Promise<Object>} - A promise that resolves to an object containing the buyer and seller fees.
     * @throws {Error} - If there is an error fetching the fees.
     */
    const fetchBuyerSellerFees = async (carTypeId) => {
      const response = await fetch(`/api/Main/GetBuyerSellerFees/${carTypeId}`);
      const data = await response.json();
      const buyerFee = data.find(fee => fee.feeType === 'Basic buyer fee');
      const sellerFee = data.find(fee => fee.feeType === "Seller's special fee");
      return {
        basicBuyerFee: {
          percentage: buyerFee.percentage / 100,
          min: buyerFee.min_value,
          max: buyerFee.max_value
        },
        sellerSpecialFee: sellerFee.percentage / 100
      };
    };

    /**
     * Fetches vehicle types from the server.
     * @async
     * @function fetchVehicleTypes
     * @returns {Promise<void>} - A promise that resolves when the vehicle types are fetched successfully.
     * @throws {Error} - If there is an error fetching the vehicle types.
     */
    const fetchVehicleTypes = async () => {
      try {
        const response = await fetch('/api/Main/GetCarTypes');
        const data = await response.json();
        vehicleTypes.value = data.map((item: { id: number, typeName: string }) => ({
          id: item.id,
          typeName: item.typeName
        }));
      } catch (error) {
        console.error('Error fetching vehicle types:', error);
      }
    };

    /**
     * Fetches vehicle type data.
     * 
     * @async
     * @function fetchVehicleTypeData
     * @returns {Promise<void>} - A promise that resolves when the vehicle type data is fetched.
     */
    const fetchVehicleTypeData = async () => {
      if (!vehicleType.value) return;

      const selectedVehicleType = vehicleTypes.value.find(type => type.id === vehicleType.value);
      if (selectedVehicleType) {
        const [storageFee, associationFee, buyerSellerFees] = await Promise.all([
          fetchStorageFees(),
          fetchAssociationFees(),
          fetchBuyerSellerFees(selectedVehicleType.id)
        ]);
        feeData.value = {
          ...feeData.value,
          ...buyerSellerFees,
          associationFee,
          storageFee
        };
      }
    };

    onMounted(async () => {
      // Fetch initial data for storage and association fees
      const [storageFee, associationFee] = await Promise.all([
        fetchStorageFees(),
        fetchAssociationFees(),
        fetchVehicleTypes()
      ]);

      feeData.value = {
        ...feeData.value,
        associationFee,
        storageFee
      };
    });

    watch(vehicleType, fetchVehicleTypeData);

    /**
     * Calculates the fees based on the fee data and base price.
     * 
     * @returns {Array} An array of fee objects with name and amount properties.
     */
    const calculatedFees = computed(() => {
      if (!feeData.value || !basePrice.value) {
        return [
          { name: 'Basic Buyer Fee', amount: 0 },
          { name: 'Seller\'s Special Fee', amount: 0 },
          { name: 'Association Fee', amount: 0 },
          { name: 'Storage Fee', amount: 0 }
        ];
      }

      const basePriceNum = parseFloat(basePrice.value) || 0;
      const fees = [];

      // Basic buyer fee
      const basicBuyerFeePercentage = feeData.value.basicBuyerFee.percentage * basePriceNum;
      const basicBuyerFeeMin = feeData.value.basicBuyerFee.min;
      const basicBuyerFeeMax = feeData.value.basicBuyerFee.max;
      const basicBuyerFee = Math.min(Math.max(basicBuyerFeePercentage, basicBuyerFeeMin), basicBuyerFeeMax);
      fees.push({ name: 'Basic Buyer Fee', amount: basicBuyerFee });

      // Seller's special fee
      const sellerSpecialFee = feeData.value.sellerSpecialFee * basePriceNum;
      fees.push({ name: 'Seller\'s Special Fee', amount: sellerSpecialFee });

      // Association fee
      const associationFeeObj = feeData.value.associationFee.find(fee => basePriceNum <= fee.max);
      const associationFee = associationFeeObj ? associationFeeObj.fee : 0;
      fees.push({ name: 'Association Fee', amount: associationFee });

      // Storage fee
      fees.push({ name: 'Storage Fee', amount: feeData.value.storageFee });

      return fees;
    });

    const totalCost = computed(() => {
      const basePriceNum = parseFloat(basePrice.value) || 0;
      return basePriceNum + calculatedFees.value.reduce((sum, fee) => sum + fee.amount, 0);
    });

    const calculate = () => {
      // This function is called when input changes
      // We don't need to do anything here as our computed properties will update automatically
    };

    return {
      basePrice,
      vehicleType,
      vehicleTypes,
      feeData, // Make sure to expose feeData
      calculatedFees,
      totalCost,
      calculate,
      fetchVehicleTypeData
    };
  }
}
</script>

<template>
  <div id="Progi">
    <h1>Car Auction Price Calculator</h1>
    <div>
      <label for="basePrice">Vehicle Base Price ($):</label>
      <input id="basePrice" v-model.number="basePrice" type="number" @input="calculate">
    </div>
    <div>
      <label for="vehicleType">Vehicle Type:</label>
      <select id="vehicleType" v-model="vehicleType" @change="fetchVehicleTypeData">
        <option v-for="type in vehicleTypes" :key="type.id" :value="type.id">{{ type.typeName }}</option>
      </select>
    </div>
    <div>
      <h2>Fee Breakdown:</h2>
      <ul>
        <li v-for="(fee, index) in calculatedFees" :key="index">
          {{ fee.name }}: ${{ fee.amount.toFixed(2) }}
        </li>
      </ul>
      <h2>Total Cost: ${{ totalCost.toFixed(2) }}</h2>
    </div>
  </div>
</template>

<style scoped>

input, select {
  margin-bottom: 10px;
  padding: 5px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  margin-bottom: 5px;
}
</style>
