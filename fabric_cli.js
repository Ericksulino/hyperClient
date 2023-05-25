const { Gateway, Wallets } = require('fabric-network');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Configurações de conexão com a rede
const ccpPath = path.resolve(__dirname, 'connection.json');
const walletPath = path.resolve(__dirname, 'wallet');
const userId = 'User1@org1.example.com';


// Função para gerar um hash aleatório
const generateRandomHash = () => {
  const timestamp = new Date().getTime().toString();
  const randomString = Math.random().toString();
  const hash = crypto.createHash('sha256').update(timestamp + randomString).digest('hex');
  return hash;
}

const submitTransaction = async (contract) => {
  try {
    // Cria uma proposta de transação
    const transaction = contract.createTransaction('createCar');

    // Define os endossadores da transação
    transaction.setEndorsingPeers(['peer0.org1.example.com', 'peer1.org1.example.com', 'peer0.org2.example.com']);

    // Endossa a proposta de transação
    const endorsement = await transaction.submit('CAR34', 'VW', 'Polo', 'Grey', 'Mary');

    // Verifica se todos os endorsements foram bem sucedidos
    if (endorsement.every(({ response }) => response.status === 200)) {
      // Espera a transação ser confirmada pela rede
      await contract.getCommitHandler().waitForEvents(transaction.getTransactionId());

      // Obtém o status da transação confirmada
      const status = await transaction.waitComplete();

      console.log(`Transaction status: ${status}`);
    } else {
      console.log('A transação foi rejeitada pelos endorsers.');
    }
  } catch (error) {
    console.error(`Erro ao enviar a transação: ${error}`);
    process.exit(1);
  }
};



const submitTransactionSimple = async (contract) => {
  try {
    // Envie a transação "createCar"
    const responseBuffer = await contract.submitTransaction('createCar', 'CAR22', 'VW', 'Polo', 'Grey', 'Mary');
    const response = responseBuffer.toString('utf8');
    if (response) {
      console.log('Transação "createCar" enviada com sucesso.');
      console.log('Resposta da transação:', response);
    } else {
      throw new Error('Resposta da transação não disponível');
    }

    process.exit(0); // Encerre o processo após a exibição da resposta
  } catch (error) {
    console.error(`Erro ao enviar a transação: ${error}`);
    process.exit(1);
  }
};


const queryAll = async (contract) => {
  try {
    // Enviando a transação "queryAllCars"
    const responseBuffer = await contract.evaluateTransaction('queryAllCars');
    const response = responseBuffer.toString('utf8');

    // Verificando se a resposta está vazia
    if (response) {
      console.log('Consulta "queryAllCars" executada com sucesso.');

      // Pasando a resposta como JSON
      const cars = JSON.parse(response);

      // Exibindo os dados dos carros
      console.log('Lista de carros:');
      cars.forEach((car) => {
        console.log(' -', car);
      });
    } else {
      console.log('Nenhum resultado retornado pela consulta.');
    }

    process.exit(0); // Encerrando o processo após a exibição da resposta
  } catch (error) {
    console.error(`Erro ao executar a consulta: ${error}`);
    process.exit(1);
  }
}



const main = async () =>{
  try {
    // Cria uma instância da classe Gateway
    const gateway = new Gateway();

    // Carrega as configurações de conexão com a rede
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Carrega a carteira
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Verifica se a carteira possui a identidade do usuário
    const identity = await wallet.get(userId);

    if (!identity) {
      console.log(`A identidade ${userId} não foi encontrada na carteira`);
      return;
    }

    // Configura as credenciais do usuário
    const certificate = identity.credentials.certificate;
    const privateKey = identity.credentials.privateKey;

    // Conecta à rede
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: false },
    });


    console.log('Conexão estabelecida com sucesso à rede Hyperledger Fabric');

    // Obtém a rede e o contrato inteligente (chaincode)
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('fabcar');


    const argument = process.argv[2];

    switch (argument) {
      case "transaction":
        submitTransaction(contract);
        break;
      case "simpleTransaction":
        submitTransactionSimple(contract);
        break;
      case "queryAll":
        queryAll(contract);
        break;
      default:
        console.log("Argumento Inválido!: "+argument);
    }
    


    // Fecha o gateway e desconecta da rede
    await gateway.disconnect();
  } catch (error) {
    console.error(`Failed to submit transaction: ${error}`);
    process.exit(1);
  }
}

main();
