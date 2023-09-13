import { defineEndpoint } from "@directus/extensions-sdk";
import { DBUtils } from "./DBUtils";
import { GenericContext, Request, Response } from "./shared/types";
import * as qrcode from 'qrcode';
import moment from 'moment';
import { Directus } from '@directus/sdk';

// used env variables
// ORG_QR_ACCESS_TOKEN
// ORG_BACKEND_URL

export default defineEndpoint(
  (router, { env, services, getSchema, database, exceptions }) => {
    // const { ItemsService } = services;


    const context: GenericContext = {
      database,
      env,
      getSchema,
      services,
      exceptions,
    };

    const org_directus = new Directus(process.env.ORG_BACKEND_URL ?? '', {
      auth: {
        staticToken: process.env.ORG_QR_ACCESS_TOKEN
      }
    });

    /**
   * as a QR user, you can generate new QR_CODE
   */
    router.post("/generate-qr-code/:qr_type?", async (req: Request, res: Response): Promise<any> => {

      try {
        console.log(`generate new qr code ...`)

        if (['url', 'wifi', 'payment'].indexOf(req.params.qr_type ?? '') === -1) {
          res.status(400).send(`qr type valid values are url,wifi and payment`);
        } else {
          const qr_type = req.params.qr_type;

          if (req.accountability) {
            const dbUtil = new DBUtils(context, req.accountability);

            const validation = await dbUtil.validate_waba_user_role(
              req.accountability.role,
              'QR'
            );

            if (!validation.status) {
              res.status(403).send(`${validation.message}. Only user with QR role is allowed.`);
            } else {

              //load user info
              const user_result = await dbUtil.get_directus_user_name_by_id(req.accountability.user)

              if (user_result.status) {

                console.log(`user info is found and loaded in db`)

                //expires in 30sec
                const exp_seconds = process.env.QR_CODE_EXPIRY_IN_SECONDS ? process.env.QR_CODE_EXPIRY_IN_SECONDS : 30;
                var expires_at = moment().add(exp_seconds, 'seconds').unix()

                const new_item = await org_directus.items("qr_codes").createOne<any>({
                  type: qr_type ?? 'url',
                  meta: req.body ?? {},
                  expiry_timestamp: expires_at,
                  email: user_result.data?.email
                })

                if (new_item) {

                  const qr_id = new_item

                  console.log(`qr code entry is created in db`)
                  console.log(new_item)
                  const qrCodeBuffer = await generateUrlQRCode(`${process.env.ORG_BACKEND_URL}/qr/scan/${qr_id}`);

                  if (qrCodeBuffer) {
                    res.contentType('image/png');
                    res.send(qrCodeBuffer);
                  } else {
                    res.status(400).json({ error: 'Invalid QR code type' });
                  }
                } else {
                  console.log(`ERROR: unable to create new QR code entry in qr_codes`)
                  console.log(new_item)
                  res.status(500).json({ error: 'Error creating QR code item' });
                }

              } else {
                res.send({ status: false, message: user_result.message })
              }
            }
          } else {
            res.status(403).send(`Only user with QR role is allowed.`);
          }
        }
      } catch (error: any) {
        res.status(500).send(error.message)
      }
    });

    async function generateUrlQRCode(url: string): Promise<Buffer> {
      return new Promise((resolve, reject) => {
        qrcode.toBuffer(url, {
          errorCorrectionLevel: 'L',
          width: 300,
          margin: 4
        }, (err, buffer: Buffer) => {
          if (err) {
            console.error('Error generating URL QR code:', err);
            reject(err);
          } else {
            console.log('URL QR code generated.');
            resolve(buffer);
          }
        });
      });
    }
  }
);
