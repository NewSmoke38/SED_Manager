import express from 'express';
import {
  getDevices,
  getDevice,
  getDeviceMetrics,
  getDeviceLogs,
  addDevice,
  deleteDevice
} from '../controllers/device.controller.js';

const router = express.Router();

// All routes are unprotected - no authentication required
router.get('/', getDevices);
router.get('/:id', getDevice);
router.get('/:id/metrics', getDeviceMetrics);
router.get('/:id/logs', getDeviceLogs);
router.post('/', addDevice);
router.delete('/:id', deleteDevice);

export default router;

