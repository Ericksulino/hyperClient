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

const submitTransaction = async (contract) =>{
    // Cria uma proposta de transação
    const transaction = contract.createTransaction('createCar');
    transaction.setEndorsingPeers(['peer0.org1.example.com']);
  
    const hash = generateRandomHash();

    // Define os argumentos da transação
    const car = ["CAR10", "VW", "Polo", "Grey", "Mary"];

    
    transaction.setTransient('CAR10',"VW", "Polo", "Grey", "Mary");
   
    //console.log("Transação: "+transaction);

    // Endossa a proposta de transação
    const endorsement = await transaction.submit();
 
    // Verifica se todos os endorsements foram bem sucedidos
    if (endorsement.every(({ response }) => response.status === 200)) {
      // Espera a transação ser confirmada pela rede
      await network.getCommitHandler().waitForEvents(transaction.getTransactionId());

   // Obtém o status da transação confirmada
   const status = await transaction.waitComplete();

      console.log(`Transaction status: ${status}`);
    } else {
      console.log('A transação foi rejeitada pelos endorsers.');
    }


    console.log(`Transaction status: ${status}`);
    console.log(`Transaction result: ${result.toString()}`);
}


const submitTransactionSimple = async (contract) => {
  try {

    // Envie a transação "createCar"
    const response = await contract.submitTransaction('createCar', 'CAR10',"VW", "Polo", "Grey", "Mary");

    console.log('Transação "createCar" enviada com sucesso.');
    console.log(`Resposta da transação: ${response.toString()}`);

    // Espera a transação ser confirmada pela rede
    await contract.submitTransaction('commit');
    console.log('Transação confirmada pela rede.');
  } catch (error) {
    console.error(`Erro ao enviar a transação: ${error}`);
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

    submitTransaction(contract);

    // Fecha o gateway e desconecta da rede
    await gateway.disconnect();
  } catch (error) {
    console.error(`Failed to submit transaction: ${error}`);
    process.exit(1);
  }
}

main();
