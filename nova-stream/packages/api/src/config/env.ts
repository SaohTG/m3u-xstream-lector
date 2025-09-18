import { plainToClass, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional() // In test env, NODE_ENV is 'test' but might not be in .env file
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  CORS_ORIGIN: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  REQUEST_TIMEOUT_MS: number;

  @IsString()
  @IsOptional()
  DEFAULT_USER_AGENT: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    {
      enableImplicitConversion: true,
      excludeExtraneousValues: true, // This helps ignore properties not defined in the class
    },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
