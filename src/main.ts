import { loadModel, Model, setupScene } from "./renderer"
import { database, loadDatabase } from "./database"
import * as THREE from "three"

let num = 0
const preloadedModels: (Model | null)[] = [null, null, null]
let loading  = false

function normalizeNum(num: number) {
    if (num < 0) num += database.models.length
    if (num >= database.models.length) num -= database.models.length
    return num
}

async function showModel(direction: number) {
    if (loading) {
        return
    }
    loading = true

    // current model
    const modelToHide = preloadedModels[1]
    if (modelToHide) {
        modelToHide.hide()
    }

    num = normalizeNum(num + direction)
    if (num < 0) num += database.models.length
    if (num >= database.models.length) num -= database.models.length
    localStorage.setItem("num", num.toString())

    let preloadPromise: Promise<void> | null = null

    let modelToUnload: Model | null = null
    if (direction === 1) {
        modelToUnload = preloadedModels.shift() ?? null   
        if (modelToUnload) {
            modelToUnload.destroy()
        }
        // allocate next
        preloadedModels.push(null)

        const nextDesc = database.models[normalizeNum(num + 1)]
        preloadPromise = loadModel(nextDesc).then(nextModel => {
            preloadedModels[2] = nextModel
        })
    } else if (direction === -1) {
        modelToUnload = preloadedModels.pop() ?? null
        // allocate prev
        preloadedModels.unshift(null)

        const nextDesc = database.models[normalizeNum(num - 1)]
        preloadPromise = loadModel(nextDesc).then(prevModel => {
            preloadedModels[0] = prevModel
        })
    }
    if (modelToUnload) {
        modelToUnload.destroy()
    }

    let modelToShow = preloadedModels[1]
    if (!modelToShow) {
        const desc = database.models[num]
        modelToShow = await loadModel(desc)
        preloadedModels[1] = modelToShow
    }
    modelToShow.play("Wait")
    modelToShow.show()

    let agitated = false
    function action() {
        modelToShow!.play(agitated ? "AtkWait" : "Wait")

        setTimeout(() => {
            if (Math.random() < 0.5) {
                agitated = !agitated
            }

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const newPos = new THREE.Vector2(-2 + Math.random() * 4, -2 + Math.random() * 4)
                const currentPos = modelToShow!.getPos()
                if (newPos.distanceTo(currentPos) > 1) {
                    modelToShow!.actionTo(agitated ? "Run" : "Walk", newPos.x, newPos.y)
                    break
                }
            }
        }, 1000)
    }

    modelToShow.onArrival = action
    action()

    if (preloadPromise) {
        await preloadPromise
    }
    loading = false
}

async function main() {
    // TODO show loader

    await loadDatabase()

    setupScene()

    num = parseInt(localStorage.getItem("num") ?? "0")
    showModel(0)
    document.body.onkeydown = async e => {
        if (e.key === "PageDown") {
            showModel(1)
        } else if (e.key === "PageUp") {
            showModel(-1)
        }     
    }
}

main()
//
