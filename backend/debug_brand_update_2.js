const mongoose = require('mongoose');
const Brand = require('./models/Brand');
const User = require('./models/User');
require('dotenv').config();

async function debugValidation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const brandId = '69de56b3bd8342bbb19ffe49';
    const brand = await Brand.findById(brandId);
    if (!brand) {
      console.log('Brand not found');
      return;
    }

    const testData = [
      { zipCode: 'SW1A 1AA', label: 'Zip code with space' },
      { zipCode: '123-456', label: 'Zip code with dash' },
      { taxId: 'ABC 123', label: 'Tax ID with space' },
      { founded: '2024', label: 'Valid founded' },
      { founded: '24', label: 'Invalid founded' }
    ];

    for (const test of testData) {
      console.log(`Testing ${test.label}: ${JSON.stringify(test)}`);
      const updateData = {};
      if (test.zipCode) updateData.address = { zipCode: test.zipCode };
      if (test.taxId) updateData.taxId = test.taxId;
      if (test.founded) updateData.founded = test.founded;

      try {
        await Brand.findByIdAndUpdate(brandId, { $set: updateData }, { runValidators: true });
        console.log(`- PASSED`);
      } catch (err) {
        console.error(`- FAILED: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugValidation();
