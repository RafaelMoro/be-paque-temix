import * as React from 'react';
import {
  Html,
  Tailwind,
  Head,
  Container,
  Heading,
  Text,
  Body,
  Link,
  Row,
  Column,
} from '@react-email/components';

interface EmailForgotPasswordProps {
  name: string;
  lastName: string;
  url: string;
}

export default function EmailForgotPassword({
  url,
  name,
  lastName,
}: EmailForgotPasswordProps): React.JSX.Element {
  return (
    <Html>
      <Head>
        <title>Reestablecer contraseña para su cuenta en Kraft Envios</title>
      </Head>
      <Tailwind>
        <Body>
          <Container>
            <Heading as="h1" className="text-4xl font-bold text-center">
              Hola {name} {lastName}
            </Heading>
            <Heading as="h2" className="mt-4 text-xl">
              ¿Olvidaste tu contraseña? Te ayudamos a recuperarla
            </Heading>
            <Text className="mb-4">
              No te preocupes, esto le puede pasar a cualquiera. Haz clic en el
              botón de abajo para recuperar el acceso a tu cuenta. Solo toma un
              momento.
            </Text>
            <Row className="my-0 mx-auto">
              <Column align="center">
                <Link
                  href={url}
                  className="justify-self-center text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 focus:outline-none text-center max-w-min"
                >
                  Recuperar contraseña
                </Link>
              </Column>
            </Row>
            <Text className="text-sm text-gray-500 mt-4">
              Si tú no pediste restablecer la contraseña, simplemente ignora
              este correo y no se realizará ningún cambio.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
