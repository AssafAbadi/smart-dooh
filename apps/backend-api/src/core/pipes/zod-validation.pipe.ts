import { ArgumentMetadata, BadRequestException, Logger, PipeTransform } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Global Zod validation pipe. Validates the incoming value with a Zod schema.
 * For body parameters, if the value is a string (e.g. from some mobile clients or proxies),
 * attempts JSON.parse before validation so all controllers benefit without per-endpoint workarounds.
 */
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger('ZodValidationPipe');

  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const paramType = metadata.type ?? 'unknown';
    const valueType = value === null ? 'null' : typeof value;
    const valuePreview =
      typeof value === 'string'
        ? value.length > 200
          ? `${value.slice(0, 200)}...`
          : value
        : typeof value === 'object'
          ? JSON.stringify(value).slice(0, 200)
          : String(value);

    // Some clients (e.g. React Native) or Nest+Fastify can deliver body as raw string; parse so object schemas get an object.
    let toValidate = value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
          toValidate = parsed;
          this.logger.log({ paramType, msg: 'string parsed as JSON object, using for validation' });
        }
      } catch {
        // not valid JSON or parsed to non-object; leave as string so Zod reports a clear error
      }
    }

    const result = this.schema.safeParse(toValidate);
    if (result.success) return result.data;

    const err = result.error as ZodError;
    const issues = err.issues;
    const messages = issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    this.logger.error({
      paramType,
      valueType,
      valuePreview: valuePreview.slice(0, 150),
      issues: issues.map((i) => ({ path: i.path, message: i.message })),
      msg: 'validation failed',
    });
    throw new BadRequestException(messages.join('; '));
  }
}
