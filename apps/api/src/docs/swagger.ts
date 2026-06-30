import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {

  const config = new DocumentBuilder()
    .setTitle('🗳️ Sistema de Votación Electrónica')
    .setDescription(
      'API REST para el Sistema de Votación Electrónica'
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access_token',
    )
    .addTag('Auth', 'Autenticación')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  return SwaggerModule.setup('api/docs', app, document);

}
