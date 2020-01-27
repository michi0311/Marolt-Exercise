/* * * * * * * * * * * * * * *
 * Created By Michael Marolt *
 * * * * * * * * * * * * * * */

const shim = require('fabric-shim');
const util = require('util');

var Chaincode = class {

  // Initialize chaincode
  async Init(stub) {
    console.log('========= example02 Init =========');
    let ret = stub.getFunctionAndParameters();
    console.log(ret);
    let args = ret.params;
    // initialise only if 1 parameters passed.
    if (args.length != 1) {
      return shim.error('Incorrect number of arguments. Expecting 1');
    }

    let A = args[0];
    
    try {
      await stub.putState(A,Buffer.from("100"));
      return shim.success();
    } catch (err) {
      return shim.error(err);
    }
  }

  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);
    let method = this[ret.fcn];
    if (!method) {
      console.log('no method of name:' + ret.fcn + ' found');
      return shim.success();
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async transfer(stub, args) {
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }

    let A = args[0];
    let B = args[1];
    if (!A || !B) {
      throw new Error('asset holding must not be empty');
    }

    let Avalbytes = await stub.getState(A);
    if (!Avalbytes) {
      throw new Error('Failed to get state of asset holder A');
    }
    let Aval = parseInt(Avalbytes.toString());

    let Bvalbytes = await stub.getState(B);
    if (!Bvalbytes) {
      throw new Error('Failed to get state of asset holder B');
    }

    let Bval = parseInt(Bvalbytes.toString());
    
    let amount = parseInt(args[2]);
    if (typeof amount !== 'number') {
      throw new Error('Expecting integer value for amount to be transaferred');
    }

    if (Aval < amount) {
      return new Error("Not enough assets")
    }

    Aval = Aval - amount;
    Bval = Bval + amount;
    console.info(util.format('Aval = %d, Bval = %d\n', Aval, Bval));

    // Write the states back to the ledger
    await stub.putState(A, Buffer.from(Aval.toString()));
    await stub.putState(B, Buffer.from(Bval.toString()));

  }

  async delete(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }

    let A = args[0];

    await stub.deleteState(A);
  }

  async query(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the person to query')
    }

    let jsonResp = {};
    let A = args[0];

    let Avalbytes = await stub.getState(A);
    if (!Avalbytes) {
      jsonResp.error = 'Failed to get state for ' + A;
      throw new Error(JSON.stringify(jsonResp));
    }

    jsonResp.name = A;
    jsonResp.amount = Avalbytes.toString();
    console.info('Query Response:');
    console.info(jsonResp);
    return Avalbytes;
  }

  async add(stub,args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting name of the person to query')
    }

    let A = args[0];

    try {
      await stub.putState(A, Buffer.from("100"));
    } catch (err) {
      return new Error('Create Unsuccessfull',err);
    } 
  }

  async get(stub,args) {
    let iterator = await stub.getStateByRange("", "");
    let allResults = [];

    while (true) {
      let res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString('utf8'));
    
        jsonRes.Name = res.value.key;
        try {
          jsonRes.Amount = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Amount = res.value.value.toString('utf8');
        }
        allResults.push(jsonRes);
      }

      if (res.done) {
        console.log('end of data');
        await iterator.close();
        console.info(allResults);
        return Buffer.from(JSON.stringify(allResults));
      }
    }
  }

  async update(stub,args) {
    if (args.length != 2) {
      throw new Error('Incorrect Number of arguments. Expecting 2')
    }

    let A = args[0]
    let Aval = args[1]

    
    try {
      await stub.putState(A, Buffer.from(Aval));
    } catch (err) {
      return new Error('Create Unsuccessfull',err);
    } 


  }
};

shim.start(new Chaincode());
