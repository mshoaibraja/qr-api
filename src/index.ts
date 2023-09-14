import { defineEndpoint } from "@directus/extensions-sdk";
import { DBUtils } from "./DBUtils";
import { GenericContext, GenericResult, Request, Response } from "./shared/types";
import * as qrcode from 'qrcode';
import moment from 'moment';
import fetch from "node-fetch";

// used env variables
// ORG_QR_ACCESS_TOKEN
// MICRO_SERVICE_URL
// backend_app_url

export default defineEndpoint(
  (router, { env, services, getSchema, database, exceptions }) => {
    const { ItemsService } = services;


    const context: GenericContext = {
      database,
      env,
      getSchema,
      services,
      exceptions,
    };  

    /**
   * as a QR user, you can generate new QR_CODE
   */
    router.post("/generate-code/:qr_type?", async (req: Request, res: Response): Promise<any> => {

      try {
        console.log(`generate new qr code ...`)

        if (!req.body.access_token) {
          res.status(400).send(`access token is required in body`);
        } else if (['url', 'wifi', 'payment'].indexOf(req.params.qr_type ?? '') === -1) {
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

              // get current waba user email 
              const response = await fetch(`${env.MICRO_SERVICE_URL}/chat/me`, {
                method: "get",
                headers: {
                  Authorization: `Bearer ${req.body.access_token}`,
                },
              });

              const waba_result = await response.json() as any;

              if (waba_result.status && waba_result.data?.length === 1) {
                const email = waba_result.data[0].email
                const role = waba_result.data[0].role.name

                console.log(`user email => ${email}, role => ${role}`)

                if (role !== 'CS-Manager') {
                  res.send({ status: false, message: 'user must be CS-Manager to generate QR Code' })
                } else {

                  //load and match waba email with ORQ users data
                  const orq_user = await dbUtil.get_items_by_query("directus_users", {
                    fields: ["email"],
                    filter: {
                      email: {
                        _eq: email
                      }
                    }
                  })

                  if (!orq_user.status) {
                    res.send(orq_user)
                  } else {
                    if (orq_user.data.length !== 1) {
                      res.send({ status: false, message: 'ORQ user email must match Waba user email.' })
                    } else {
                      //expires in 30sec
                      const exp_seconds = process.env.QR_CODE_EXPIRY_IN_SECONDS ? process.env.QR_CODE_EXPIRY_IN_SECONDS : 30;
                      var expires_at = moment().add(exp_seconds, 'seconds').unix()

                      const new_item = await dbUtil.create_item<GenericResult<any>>("qr_codes", {
                        type: qr_type ?? 'url',
                        meta: req.body ?? {},
                        expiry_timestamp: expires_at,
                        email
                      })

                      if (new_item.status && new_item.data) {

                        const qr_id = new_item.data

                        console.log(`qr code entry is created in db`)
                        console.log(new_item)
                        const qrCodeBuffer = await generateUrlQRCode(`${process.env.backend_app_url}/qr/scan-code/${qr_id}`);

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
                    }
                  }
                }
              } else {
                if (!waba_result.status) console.log(waba_result.message)

                res.send({ status: false, message: 'unable to get waba user email from microservice' })
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

    router.get("/scan-code/:id", async (req: Request, res: Response) => {

      try {
        if (!req.params.id) {
          res.send({ status: false, message: "invalid qr id" })
        } else {
          if (!req.accountability?.user) {
            res.send({ status: false, message: "invalid user" })
          } else {           
            const dbUtil = new DBUtils(context);

            const qr_result = await dbUtil.update_item_by_query("qr_codes", {
              _and: [
                {
                  id: {
                    _eq: req.params.id
                  }
                }, {
                  status: {
                    _eq: 'draft'
                  }
                }
              ]
            }, {
              status: "scanned"
            });

            console.log(`qr_code result `)
            console.log(qr_result)
            if (qr_result.status && qr_result.data.length === 1) {
              console.log(`qr code is scanned`)
              res.send({ status: true })

            } else if (qr_result.status && qr_result.data.length === 0) {
              res.send({ status: false, message: `either qrcode is already scanned or invalid qr_code` })
            } else {
              console.log(`qr code could not scan`)
              console.log(qr_result)
              res.send({ status: false, message: 'qr code could not scan' })
            }
          }
        }
      } catch (exp: any) {
        res.send({ status: false, message: `${exp.message}` })
      }
    })

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
