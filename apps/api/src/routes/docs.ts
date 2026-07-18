import { Router } from 'express';
import { getOpenApiDocument } from '../openapi/document.js';

const router: Router = Router();

/**
 * GET /api/v1/docs — spécification OpenAPI 3.0 de l'API plateforme (JSON).
 *
 * Publique et non authentifiée : c'est un contrat de doc, dérivé des schémas
 * zod de `packages/shared`. N'expose aucun secret ni les routes internes
 * `/internal/*` (celles-ci ne sont jamais enregistrées dans le document).
 *
 * UI Swagger : volontairement non embarquée (aucune dépendance lourde ni CDN
 * externe, conformément à la politique CSP d'`helmet`). Pour en brancher une
 * en local sans rien committer :
 *   npx @redocly/cli preview-docs http://localhost:8081/api/v1/docs
 * ou pointer une instance Swagger UI / Scalar sur cette URL.
 */
router.get('/docs', (_req, res) => {
  res.json(getOpenApiDocument());
});

export default router;
