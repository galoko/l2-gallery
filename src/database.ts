type Usage = {
    id: number
    name: string
    lvl: number
}

export type ModelDesc = {
    name: string
    walkSpeed: number
    runSpeed: number
    colRadius: number
    colHeight: number
    usages: Usage[]
}

export type Database = {
    models: ModelDesc[]
}

export let database: Database

export async function loadDatabase() {  
    database = await (await fetch("build/database.json")).json()
}