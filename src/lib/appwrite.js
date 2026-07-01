import { Account, Client, Databases } from 'appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6a34a6e70033d0a67b56')

const account = new Account(client)
const databases = new Databases(client)

export { client, account, databases }
