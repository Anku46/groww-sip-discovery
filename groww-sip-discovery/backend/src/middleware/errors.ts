import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import type { Logger } from '../logger'

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` })
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Request is invalid.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
      return
    }
    // body-parser: malformed JSON or payload too large
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'invalid_json', message: 'Request body is not valid JSON.' })
      return
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: 'payload_too_large', message: 'Request body is too large.' })
      return
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code, message: err.message })
      return
    }
    logger.error({ err: { message: err?.message, stack: err?.stack }, method: req.method, path: req.path }, 'unhandled error')
    res.status(500).json({ error: 'internal_error', message: 'Something went wrong on the server.' })
  }
}
