// routes/contractRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getContractByDeal,
  getContract,
  createContractFromDeal,
  generateFromTemplate,
  updateContract,
  signContractHandler,
  sendForSignature,
  downloadContract,
  getUserContracts,
  getContractHistory,
  amendContract
} = require('../controllers/contractController');

// All routes are protected
router.use(protect);

router.get('/user', getUserContracts);
router.get('/deal/:dealId', getContractByDeal);
router.get('/:id', getContract);
router.post('/generate', generateFromTemplate);
router.post('/create-from-deal/:dealId', createContractFromDeal);
router.put('/:id', updateContract);
router.post('/:id/sign', signContractHandler);
router.post('/:id/send-for-signature', sendForSignature);
router.get('/:id/download', downloadContract);
router.get('/:id/history', getContractHistory);
router.post('/:id/amend', amendContract);

module.exports = router;