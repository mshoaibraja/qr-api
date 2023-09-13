import {
    Accountability, GenericContext, GenericResult, IUser, Query,Directus
} from "./shared/types";

export class DBUtils {
    context: GenericContext;
    accountability?: Accountability;

    constructor(context: GenericContext, accountability?: Accountability) {
        this.context = context;
        this.accountability = accountability;
    }





    // tbd 0713 not used
    // async save_chat_session_entry(chat_id: string, payload: DialogflowResponse): Promise<GenericResult<string>> {
    //     console.log(`going to create chat session entry in web hook ...`);
    //     const chat_session_result = await this.get_items_by_query("chatbot_sessions", {
    //         fields: ["results"],
    //         filter: {
    //             session_id: {
    //                 _eq: chat_id
    //             }
    //         }
    //     })

    //     if (!chat_session_result.status) return { status: false, message: `unable to retrieve chatbot_sessions data against session_id = ${chat_id}` }

    //     let temp: DialogflowResponse[] = []

    //     if (chat_session_result.data?.length > 0) {
    //         const chatbot_results = chat_session_result.data[0]["results"] as DialogflowResponse[];
    //         temp.concat(chatbot_results)
    //     }

    //     //append latest entry
    //     temp.push(payload)

    //     const save_result = await this.update_item_by_query("chatbot_sessions", {
    //         session_id: {
    //             _eq: chat_id
    //         }
    //     }, temp)

    //     if (!save_result.status) return { status: false, message: `unable to update chatbot_sessions against session_id = ${chat_id}` }

    //     return { status: true }
    // }

    //0713 tbd not used
    // async close_dialogflow_session(chat_id: string, bot_key: string): Promise<GenericResult<any>> {

    //     const bot_messages = await this.get_items_by_query("chats_messages", {
    //         fields: ["id", "content", "bot_key"],
    //         filter: {
    //             _and: [
    //                 {
    //                     chat: {
    //                         _eq: chat_id
    //                     }
    //                 },
    //                 {
    //                     bot_key: {
    //                         _eq: bot_key
    //                     }
    //                 }
    //             ]
    //         },
    //         sort: ["id"]
    //     });

    //     console.log(`-------------close bot session-------------------`)
    //     console.log(`----------bot session summary messages-----------`)
    //     console.log(`chat_id = ${chat_id}, bot_key = ${bot_key}`)
    //     console.log(JSON.stringify(bot_messages))
    //     console.log(`-------------------------------------------------`)

    //     const session_result = await this.update_item_by_query("chatbot_sessions", {
    //         _and: [
    //             {
    //                 bot_key: {
    //                     _eq: bot_key
    //                 }
    //             },
    //             {
    //                 session_id: {
    //                     _eq: chat_id
    //                 }
    //             }, {
    //                 time_end: {
    //                     _null: true
    //                 }
    //             }
    //         ]
    //     }, {
    //         time_end: new Date(),
    //         results: bot_messages.status ? bot_messages.data : []
    //     });

    //     console.log(`----------bot session result status--------------`)
    //     console.log(JSON.stringify(session_result))
    //     console.log(`-------------------------------------------------`)

    //     return { status: true, data: session_result }
    // }

    //All generic DB related functions
    async create_item<T>(collection: string, payload: any): Promise<GenericResult<T>> {
        const context = {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        }

        const { ItemsService } = this.context.services
        const service = new ItemsService(collection, context);

        try {
            return { status: true, data: await service.createOne(payload) };
        } catch (error: any) {
            return {
                status: false,
                message: error.message,
            };
        }
    }

    async create_items<T>(collection: string, payload: any[]): Promise<GenericResult<T>> {
        const context = {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        }

        const { ItemsService } = this.context.services
        const service = new ItemsService(collection, context);

        try {
            return { status: true, data: await service.createMany(payload) };
        } catch (error: any) {
            return {
                status: false,
                message: error.message,
            };
        }
    }

    async update_item_by_query(collection: string, filter: any, payload: any): Promise<GenericResult<any>> {
        const context = {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        }

        const { ItemsService } = this.context.services

        const someService = new ItemsService(collection, context);

        try {
            return {
                status: true,
                data: await someService.updateByQuery({ filter }, payload),
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message,
            };
        }
    }


    async delete_item(collection: string, id: any): Promise<GenericResult<any>> {
        console.log(`delete id = '${id}'`)
        // console.log(this.accountability)

        const context = {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        }

        const { ItemsService } = this.context.services
        const service = new ItemsService(collection, context);

        try {
            return {
                status: true,
                data: await service.deleteOne(id),
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message,
            };
        }
    }

    async get_items_by_query(collection: string, query: Query): Promise<GenericResult<any>> {
        const context = {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        }

        const { ItemsService } = this.context.services

        const service = new ItemsService(collection, context);

        return await service
            .readByQuery(query)
            .then((results: any) => {
                return { status: true, data: results };
            })
            .catch((error: any) => {
                return { status: false, message: error.message, error };
            });
    }

    //misc
    async get_roles_by_id_names(role_id: string, names: string): Promise<GenericResult<Directus.Role[]>> {
        try {
            let query = `SELECT * FROM directus_roles where id = '${role_id}' and find_in_set(name,'${names}') > 0;`;
            // console.log(query)
            const response = await this.context.database.raw(query);
            return { status: true, data: response[0] };
        } catch (error: any) {
            return { status: false, message: error.message };
        }
    }

    async validate_waba_user_role(role_id: string, target_roles: string = 'CS-Manager,CS'): Promise<GenericResult<any>> {
        const proper_role = await this.get_roles_by_id_names(
            role_id,
            target_roles
        );
        // console.log(proper_role);
        if (!proper_role.status) {
            return proper_role;
        }

        if (proper_role.data?.length === 0) {
            return {
                status: false,
                message: `only ${target_roles} are suppose to perform this action`
            };
        } else {
            return proper_role;
        }
    }

    async update_item(item_name: string, key: string, payload: any): Promise<GenericResult<any>> {
        const { ItemsService } = this.context.services;
        console.log(`***UPDATE:${item_name}/key***`);
        console.log(payload);

        const someService = new ItemsService(item_name, {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        });

        try {
            return {
                status: true,
                data: await someService.updateOne(key, payload),
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message,
            };
        }
    }

    async create_new_item(item_name: string, payload: any): Promise<GenericResult<any>> {
        const { ItemsService } = this.context.services;
        console.log(`***CREATE:${item_name}***`);
        console.log(payload);

        const someService = new ItemsService(item_name, {
            knex: this.context.database,
            schema: await this.context.getSchema(),
            accountability: this.accountability
        });

        try {
            return { status: true, data: await someService.createOne(payload) };
        } catch (error: any) {
            console.log(error)
            return {
                status: false,
                message: error.message,
            };
        }
    }

    async get_directus_user_name_by_id(id: string): Promise<GenericResult<IUser>> {
        const { ItemsService } = this.context.services;
        const service = new ItemsService(
            "directus_users",
            {
                knex: this.context.database,
                schema: await this.context.getSchema(),
                accountability: this.accountability
            }
        );

        return await service
            .readByQuery({
                fields: [
                    "email"
                ],
                filter: {
                    id: {
                        _eq: id
                    }
                },
            })
            .then((results: any) => {
                if (results.length > 0) {
                    return { status: true, data: results[0] };
                } else {
                    return { status: false, message: 'no user data found' };
                }
            })
            .catch((error: any) => {
                console.log(error);
                return { status: false, message: error.message };
            });
    }

    async delete_many_items(item_name: string, ids: any) {
        const { ItemsService } = this.context.services;
        const someService = new ItemsService(
            item_name,
            {
                knex: this.context.database,
                schema: await this.context.getSchema(),
                accountability: this.accountability
            }
        );

        try {
            return {
                status: true,
                data: await someService.deleteMany(ids),
            };
        } catch (error: any) {
            console.log(error);
            return {
                status: false,
                message: error.message,
                error,
                collection: item_name,
            };
        }
    }

    async load_users_by_role_names(role_names: string) {
        let query = `select users.id as user_id, users.first_name,users.last_name,roles.name as role_name from directus_roles as roles inner join directus_users as users on users.role = roles.id 
            where find_in_set(roles.name,'${role_names}')
            and users.status = 'active';`;

        try {
            const response = await this.context.database.raw(query);

            if (response.length > 0) return { status: true, data: response[0] };
            else return { status: true, data: [] };
        } catch (error: any) {
            return { status: false, error, message: error.message };
        }
    }
}