import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import {
  validateCreateProduct,
  validateReserveProduct,
  validateBulkReserve,
  validateCheckout,
  validateProductId,
  validateUserId,
} from '../middleware/validation';

const router = Router();

router.post('/products', validateCreateProduct, ProductController.createProduct);

router.post('/reserve', validateReserveProduct, ProductController.reserveProduct);

router.post('/checkout', validateCheckout, ProductController.checkout);

router.delete('/reserve/:userId/:productId', validateUserId, validateProductId, ProductController.cancelReservation);

router.get('/products/:productId/status', validateProductId, ProductController.getProductStatus);

router.get('/users/:userId/reservations', validateUserId, ProductController.getUserReservations);

router.post('/reserve/bulk', validateBulkReserve, ProductController.bulkReserve);

export default router;