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

interface BalanceRequestDecisionProps {
  name: string;
  action: 'approved' | 'rejected';
  amount: number;
  reason?: string;
}

const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);

export default function BalanceRequestDecision({
  name,
  action,
  amount,
  reason,
}: BalanceRequestDecisionProps): React.JSX.Element {
  const outcome = action === 'approved' ? 'aprobada' : 'rechazada';

  return (
    <Html>
      <Head>
        <title>Actualizacion de solicitud de saldo en Kraft Envios</title>
      </Head>
      <Tailwind>
        <Body>
          <Container>
            <Heading as="h1" className="text-3xl font-bold text-center">
              Solicitud de saldo {outcome}
            </Heading>
            <Text>Hola {name},</Text>
            <Text>
              Tu solicitud por {formatAmount(amount)} fue {outcome}.
            </Text>
            {reason ? <Text>Motivo: {reason}</Text> : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
