import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { FC, useCallback, useEffect, useState } from "react";
import { notify } from "../../utils/notifications";
import idl from "./solanapdas.json";

const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);
const programId = idl.metadata.address;

import {
  Program,
  AnchorProvider,
  web3,
  BN,
  ProgramAccount,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Solanapdas } from "./solanapdas";

export const Bank: FC = () => {
  const [banks, setBanks] = useState<
    ProgramAccount<{ balance: BN; name: string; owner: PublicKey }>[]
  >([]);
  const wallet = useWallet();
  const { connection } = useConnection();

  const getProvider = () =>
    new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  const createBank = async () => {
    try {
      const provider = getProvider();
      const program = new Program(
        idlObject,
        programId,
        provider
      ) as Program<Solanapdas>;
      const [bank, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("bankaccount"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      program.methods
        .create("WSOS Bank " + wallet.publicKey.toBase58().slice(0, 6))
        .accounts({
          bank,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      await getBanks();
      console.log("created a bank");
    } catch (error) {
      console.log(error);
    }
  };

  const getBanks = async () => {
    try {
      const provider = getProvider();
      const program = new Program(
        idlObject,
        programId,
        provider
      ) as Program<Solanapdas>;
      const banks = await program.account.bank.all();
      // @ts-ignore
      setBanks(banks);
      console.log(banks);
    } catch (error) {
      console.log(error);
    }
  };

  const depositBank = async (bank: PublicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(
        idlObject,
        programId,
        provider
      ) as Program<Solanapdas>;

      await program.methods
        .deposit(new BN(0.1 * web3.LAMPORTS_PER_SOL))
        .accounts({
          bank,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      await getBanks();
    } catch (error) {
      console.log(error);
    }
  };

  const withdrawBank = async (bank: PublicKey, amount: BN) => {
    const KEEP_RENT = new BN(35690880);
    try {
      const provider = getProvider();
      const program = new Program(
        idlObject,
        programId,
        provider
      ) as Program<Solanapdas>;
      const withdrawAmount = amount.sub(KEEP_RENT);
      await program.methods
        .withdraw(withdrawAmount)
        .accounts({
          bank,
          user: provider.wallet.publicKey,
        })
        .rpc({ commitment: "confirmed" });
      await getBanks();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getBanks();
  }, []);

  if (!wallet.publicKey) return <div>Wallet not connected</div>;

  return (
    <>
      <div className="flex flex-row justify-center">
        <div className="relative group items-center">
          <div
            className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
      rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"
          ></div>
          <button
            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
            onClick={() => createBank()}
          >
            Create bank
          </button>

          <button
            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
            onClick={() => getBanks()}
          >
            Refresh banks
          </button>
        </div>
      </div>
      {banks.map((bank) => {
        return (
          <div
            key={bank.publicKey.toString()}
            className="md:hero-content flex flex-col"
          >
            <h1>{bank.account.name}</h1>
            <span>{bank.account.balance.toString()}</span>
            <button
              className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
              onClick={() => depositBank(bank.publicKey)}
            >
              Deposit 0.1
            </button>
            <button
              className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
              onClick={() => withdrawBank(bank.publicKey, bank.account.balance)}
            >
              Withdraw All
            </button>
          </div>
        );
      })}
    </>
  );
};
