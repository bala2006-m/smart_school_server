import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfigService } from '../common/database/database.config';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dbConfig: DatabaseConfigService,
    @Inject(REQUEST) private readonly request: any,
  ) { }
  async fetchAll(school_id?: number) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const accountsCash = await (client as any).studentFees.findMany({
      where: {
        school_id: Number(school_id), payments: {
          every: {
            method: 'cash'
          }
        }
      },
      select: { paid_amount: true }
    });
    const accountsOnline = await (client as any).studentFees.findMany({
      where: {
        school_id: Number(school_id), payments: {
          every: {
            method: 'online'
          }
        }
      },
      select: { paid_amount: true }
    });
    const busCash = await (client as any).busFeePayment.findMany({
      where: { school_id: Number(school_id), payment_mode: 'CASH' },
      select: { amount_paid: true }
    });
    const busOnline = await (client as any).busFeePayment.findMany({
      where: { school_id: Number(school_id), payment_mode: 'ONLINE' },
      select: { amount_paid: true }
    });
    const rteCash = await (client as any).rteFeePayment.findMany({
      where: { school_id: Number(school_id), payment_mode: 'cash' },
      select: { amount_paid: true }
    });
    const rteOnline = await (client as any).rteFeePayment.findMany({
      where: { school_id: Number(school_id), payment_mode: 'online' },
      select: { amount_paid: true }
    });
    // helper to sum amounts
    const sum = (arr: Array<{ paid_amount?: number; amount_paid?: number }>) =>
      arr.reduce((acc, curr) => acc + (curr.paid_amount ?? curr.amount_paid ?? 0), 0);

    const totals = {
      termCash: sum(accountsCash),
      termOnline: sum(accountsOnline),
      termFeesTotal: sum(accountsCash) + sum(accountsOnline),
      busCash: sum(busCash),
      busOnline: sum(busOnline),
      busFeeTotal: sum(busCash) + sum(busOnline),
      rteCash: sum(rteCash),
      rteFeesOnline: sum(rteOnline),
      rteFeesTotal: sum(rteCash) + sum(rteOnline),
      grandTotal: sum(accountsCash) + sum(accountsOnline) + sum(busCash) + sum(busOnline) + sum(rteCash) + sum(rteOnline),
    };
    return totals;
    //   return {
    //     termFees: accounts,
    //     busFee: bus,
    //     rteFees: rte,
    //     totals
    //   };
  }
  async fetchAllPeriodical(school_id: number, from: Date, to: Date) {
    const client = this.dbConfig.getDatabaseClient(this.request);
    const format = (d: Date) =>
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;

    const fromDate = format(from);
    const toDate = format(to);

    const beforeAccountsCash = await client.$queryRaw<
      { paid_amount: number }[]
    >`
  SELECT sf.paid_amount 
  FROM StudentFees sf
  INNER JOIN FeePayments fp ON sf.aId = fp.student_fee_id
  WHERE sf.school_id = ${school_id}
  AND fp.method = 'CASH'
  AND DATE(fp.payment_date) < ${toDate}
`;

    const beforeAccountsOnline = await client.$queryRaw<
      { paid_amount: number }[]
    >`
  SELECT sf.paid_amount 
  FROM StudentFees sf
  INNER JOIN FeePayments fp ON sf.aId = fp.student_fee_id
  WHERE sf.school_id = ${school_id}
  AND fp.method = 'ONLINE'
  AND DATE(fp.payment_date) < ${toDate}
`;


    const beforeBusCash = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
     AND payment_mode= 'CASH'
    AND DATE(payment_date) <${toDate};
  `;
    const beforeBusOnline = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
     AND payment_mode= 'ONLINE'
    AND DATE(payment_date) < ${toDate};
  `;
    const beforeRteCash = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND payment_mode= 'cash'
    AND DATE(payment_date) < ${toDate};
  `;
    const beforeRteOnline = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND payment_mode= 'online'
    AND DATE(payment_date) < ${toDate};
  `;
    const beforeFinance = await client.$queryRaw<
      { amount: number, type: string }[]
    >`
    SELECT amount,reason,type
    FROM Finance
    WHERE school_id = ${school_id}
    AND DATE(updated_at) < ${toDate};
  `;


    const accountsCash = await client.$queryRaw<
      { paid_amount: number }[]
    >`
  SELECT sf.paid_amount 
  FROM StudentFees sf
  INNER JOIN FeePayments fp ON sf.aId = fp.student_fee_id
  WHERE sf.school_id = ${school_id}
  AND fp.method = 'CASH'
  AND DATE(fp.payment_date) BETWEEN ${fromDate} AND ${toDate}
`;

    const accountsOnline = await client.$queryRaw<
      { paid_amount: number }[]
    >`
  SELECT sf.paid_amount 
  FROM StudentFees sf
  INNER JOIN FeePayments fp ON sf.aId = fp.student_fee_id
  WHERE sf.school_id = ${school_id}
  AND fp.method = 'ONLINE'
  AND DATE(fp.payment_date) BETWEEN ${fromDate} AND ${toDate}
`;


    const busCash = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
     AND payment_mode= 'CASH'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const busOnline = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM BusFeePayment
    WHERE school_id = ${school_id}
     AND payment_mode= 'ONLINE'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const rteCash = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND payment_mode= 'cash'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const rteOnline = await client.$queryRaw<
      { amount_paid: number }[]
    >`
    SELECT amount_paid
    FROM RteFeePayment
    WHERE school_id = ${school_id}
    AND payment_mode= 'online'
    AND DATE(payment_date) BETWEEN ${fromDate} AND ${toDate};
  `;
    const finance = await client.$queryRaw<
      { amount: number }[]
    >`
    SELECT amount,reason,type
    FROM Finance
    WHERE school_id = ${school_id}
    AND DATE(updated_at) BETWEEN ${fromDate} AND ${toDate};
  `;

    let finTot = 0;

    const sum = (arr: any[]) =>
      arr.reduce(
        (acc, curr) =>
          acc + (curr.paid_amount ?? curr.amount_paid ?? 0),
        0
      );
    for (var i = 0; i < finance.length; i++) {


      finTot += (finance[i]['amount'])
    }


    const totals = beforeFinance.reduce((acc, { amount, type }) => {
      if (acc.hasOwnProperty(type)) {
        acc[type] += amount;
      }
      return acc;
    }, {
      INCOME: 0,
      EXPENSE: 0,
      DRAWING_IN: 0,
      DRAWING_OUT: 0
    });


    const beforeCashOnHand = sum(beforeAccountsCash) + sum(beforeBusCash) + sum(beforeRteCash) + totals.INCOME + totals.DRAWING_IN - totals.DRAWING_OUT - totals.EXPENSE;



    const beforeCashOnBank = sum(beforeAccountsOnline) + sum(beforeBusOnline) + sum(beforeRteOnline);

    return {
      beforetotal: beforeCashOnBank + beforeCashOnHand,
      beforeCashOnHand,
      beforeCashOnBank,
      termCash: sum(accountsCash),
      termOnline: sum(accountsOnline),
      termFeesTotal: sum(accountsCash) + sum(accountsOnline),
      busCash: sum(busCash),
      busOnline: sum(busOnline),
      busFeeTotal: sum(busCash) + sum(busOnline),
      rteCash: sum(rteCash),
      rteOnline: sum(rteOnline),
      rteFeesTotal: sum(rteCash) + sum(rteOnline),
      finance,
      grandTotal: sum(accountsCash) + sum(accountsOnline) + sum(busCash) + sum(busOnline) + sum(rteCash) + sum(rteOnline) + finTot,
    };
  }



}