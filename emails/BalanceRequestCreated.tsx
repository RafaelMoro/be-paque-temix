import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Tailwind,
  Text,
} from '@react-email/components';

interface BalanceRequestCreatedProps {
  requesterName: string;
  amount: number;
  paymentReference?: string;
  createdAt: Date;
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
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
