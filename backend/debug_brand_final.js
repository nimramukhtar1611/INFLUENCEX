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
    
    console.log('Original fullName:', brand.fullName);

    // Force fullName to be empty in the DB for a moment (bypass validation)
    await User.collection.updateOne({ _id: brand._id }, { $set: { fullName: '' } });
    console.log('Forced empty fullName in DB');

    const cleanData = {
      brandName: "New Brand Name"
    };

    console.log('Attempting update with cleanData:', JSON.stringify(cleanData, null, 2));

    try {
      const result = await Brand.findByIdAndUpdate(brandId, { $set: cleanData }, { runValidators: true, new: true });
      console.log('Update PASSED even with empty fullName in DB');
    } catch (err) {
      console.error('Update FAILED:');
      console.error(err.message);
    }

    // Restore fullName
    await User.collection.updateOne({ _id: brand._id }, { $set: { fullName: brand.fullName } });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugValidation();
