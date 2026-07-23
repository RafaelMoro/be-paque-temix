import * as React from 'react';
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Row,
  Tailwind,
  Text,
} from '@react-email/components';

interface BalanceRequestCreatedProps {
  requesterName: string;
  amount: number;
  paymentReference?: string;
  createdAt: Date;
  url: string;
}

const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);

export default function BalanceRequestCreated({
  requesterName,
  amount,
  paymentReference,
  createdAt,
  url,
}: BalanceRequestCreatedProps): React.JSX.Element {
  return (
    <Html>
      <Head>
        <title>Nueva solicitud de saldo en Kraft Envios</title>
      </Head>
      <Tailwind>
        <Body>
          <Container>
            <Heading as="h1" className="text-3xl font-bold text-center">
              Nueva solicitud de saldo
            </Heading>
            <Text>{requesterName} solicito agregar saldo a su cuenta.</Text>
            <Text>Monto solicitado: {formatAmount(amount)}</Text>
            {paymentReference ? (
              <Text>Referencia de transferencia: {paymentReference}</Text>
            ) : null}
            <Text>
              Fecha de solicitud: {createdAt.toLocaleDateString('es-MX')}
            </Text>
            <Row className="my-0 mx-auto">
              <Column align="center">
                <Link
                  href={url}
                  className="text-white bg-blue-700 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 text-center max-w-min"
                >
                  Ver solicitud
                </Link>
              </Column>
            </Row>
            <Text className="text-sm text-gray-500 mt-4">
              Ingresa a la plataforma para revisar y aprobar o rechazar esta
              solicitud.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
