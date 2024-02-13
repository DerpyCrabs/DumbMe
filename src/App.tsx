import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useMemo, useState } from 'react'

type PlateSet = {
  weight: number
  count: number
}

type Task = {
  type: 'MoreOrEqual'
  expectedWeight: number
  dumbbellWeight: number
  numberOfDumbbells: number
}

type Profile = {
  task: Task
}

type SaveableState = {
  profiles: Profile[]
  plateSets: PlateSet[]
}

const saveableStateAtom = atomWithStorage<SaveableState>('state', {
  profiles: [],
  plateSets: [
    {
      weight: 5,
      count: 5,
    },
    {
      weight: 1.25,
      count: 3,
    },
  ],
})

const aLittleMore = 1

type PlateSetCombination = { sets: PlateSet[]; totalWeight: number }

function findCombinations(plateSets: PlateSet[], task: Task): { combinations: PlateSetCombination[] } | null {
  if (Number.isNaN(task.expectedWeight) || Number.isNaN(task.dumbbellWeight) || task.expectedWeight === 0) {
    return null
  } else {
    const possiblePlateSets = plateSets
      .filter((ps) => ps.count >= task.numberOfDumbbells * 2 && ps.weight !== 0)
      .flatMap((ps) =>
        [...new Array(Math.floor(ps.count / (task.numberOfDumbbells * 2)))].map((_, i) => ({
          count: 2,
          weight: ps.weight,
        }))
      )

    const addPlateSet = (ps: PlateSet, combinations: PlateSetCombination[]): PlateSetCombination[] => {
      return combinations.flatMap((c) => {
        const weight = c.totalWeight + ps.weight * ps.count
        if (weight > task.expectedWeight + aLittleMore) {
          return [c]
        }
        const existingSet = c.sets.find((s) => s.weight === ps.weight)
        return [
          c,
          {
            totalWeight: weight,
            sets: [
              existingSet ? { weight: ps.weight, count: existingSet.count + ps.count } : ps,
              ...c.sets.filter((s) => s.weight !== ps.weight),
            ].toSorted((a, b) => a.weight - b.weight),
          },
        ] as PlateSetCombination[]
      })
    }

    const combinations = possiblePlateSets
      .reduce((acc, ps) => addPlateSet(ps, acc), [
        { sets: [], totalWeight: task.dumbbellWeight },
      ] as PlateSetCombination[])
      .filter((c) => c.totalWeight >= task.expectedWeight)
      .map((c) => ({ ...c, sets: c.sets.filter((ps) => ps.count !== 0) }))
      .reduce(
        (acc, c) =>
          acc.some(
            (ec) =>
              ec.sets.length === c.sets.length &&
              ec.sets.every((s1, i) => s1.weight === c.sets[i].weight && s1.count === c.sets[i].count)
          ) || c.sets.length === 0
            ? acc
            : [...acc, c],
        [] as PlateSetCombination[]
      )
      .toSorted((c1, c2) => c2.sets.length - c1.sets.length)
      .toSorted((c1, c2) => c1.totalWeight - c2.totalWeight)

    return {
      combinations,
    }
  }
}

export default function App() {
  const [state, setState] = useAtom(saveableStateAtom)

  const [currentTask, setCurrentTask] = useState<Task>({
    type: 'MoreOrEqual',
    expectedWeight: NaN,
    dumbbellWeight: 2,
    numberOfDumbbells: 1,
  })

  const answer = useMemo(() => findCombinations(state.plateSets, currentTask), [state.plateSets, currentTask])

  return (
    <div className='m-8 flex flex-col gap-4'>
      <h1 className='font-bold text-3xl'>Dumb me!</h1>
      <h2 className='text-xl text-gray-700 font-bold'>Dumbbell weight set combinator</h2>

      <div className='flex gap-4 flex-wrap'>
        <div className='basis-80 bg-gray-200 p-4 flex flex-col gap-2 rounded-md'>
          <h3 className='font-semibold text-gray-700 text-md'>I have</h3>
          <ul className='flex flex-col gap-1'>
            {state.plateSets.map((ps, i) => (
              <li key={i}>
                {i + 1}){' '}
                <input
                  type='number'
                  defaultValue={ps.count}
                  pattern='[0-9]+'
                  className='min-w-0 w-12 px-1 rounded'
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      plateSets: [
                        ...s.plateSets.slice(0, i),
                        { ...ps, count: e.target.valueAsNumber },
                        ...s.plateSets.slice(i + 1),
                      ],
                    }))
                  }
                />{' '}
                x{' '}
                <input
                  type='number'
                  defaultValue={ps.weight}
                  pattern='[0-9]+([\.,][0-9]+)?'
                  step='0.05'
                  className='min-w-0 w-20 px-1 rounded'
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      plateSets: [
                        ...s.plateSets.slice(0, i),
                        { ...ps, weight: e.target.valueAsNumber },
                        ...s.plateSets.slice(i + 1),
                      ],
                    }))
                  }
                />{' '}
                <span className='text-gray-800 text-sm'>kg</span>
                <button
                  className='ml-1 text-red-400 font-bold px-1 hover:bg-gray-300 rounded-full w-6'
                  onClick={() =>
                    setState((s) => ({ ...s, plateSets: [...s.plateSets.slice(0, i), ...s.plateSets.slice(i + 1)] }))
                  }
                >
                  x
                </button>
              </li>
            ))}
            <li>
              <button
                className='bg-gray-300 px-4 m-1 rounded-full font-semibold'
                onClick={() => setState((s) => ({ ...s, plateSets: [...s.plateSets, { count: 1, weight: 1 }] }))}
              >
                Add set
              </button>
            </li>
          </ul>
        </div>
        <div className='basis-100 bg-gray-200 p-4 flex flex-col gap-4 rounded-md'>
          <div className='flex flex-col gap-2'>
            <h3 className='font-semibold text-gray-700 text-md'>I want</h3>
            <div>
              <select
                className='rounded px-1'
                value={currentTask.numberOfDumbbells}
                onChange={(e) => setCurrentTask((ct) => ({ ...ct, numberOfDumbbells: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                  <option value={c} key={c}>
                    {c}
                  </option>
                ))}
              </select>{' '}
              {currentTask.numberOfDumbbells === 1 ? 'dumbbell' : 'dumbbells'} with weight equal or a little more than{' '}
              <input
                type='number'
                pattern='[0-9]+([\.,][0-9]+)?'
                step='0.05'
                className={`min-w-0 w-20 x-1 rounded border-2 ${
                  currentTask.expectedWeight && !Number.isNaN(currentTask.expectedWeight) ? '' : 'border-red-300'
                }`}
                onChange={(e) =>
                  setCurrentTask((ct) => ({
                    ...ct,
                    expectedWeight: e.target.valueAsNumber,
                  }))
                }
              />
              <span className='pl-1'>kg</span>
              <br />
              Weight of an empty dumbbell is{' '}
              <input
                type='number'
                defaultValue={currentTask.dumbbellWeight || 2}
                pattern='[0-9]+([\.,][0-9]+)?'
                step='0.05'
                className='min-w-0 w-20 px-1 rounded'
                onChange={(e) =>
                  setCurrentTask((ct) => ({
                    ...ct,
                    dumbbellWeight: e.target.valueAsNumber,
                  }))
                }
              />
              <span className='pl-1'>kg</span>
            </div>
          </div>

          {answer && (
            <div className='flex flex-col gap-2'>
              {answer.combinations.length === 0 ? (
                <h3 className='font-semibold text-gray-700 text-md'>No possible combinations</h3>
              ) : (
                <>
                  <h3 className='font-semibold text-gray-700 text-md'>Possible combinations</h3>
                  <ul>
                    {answer.combinations.map((c, i) => (
                      <li key={i}>
                        {i + 1}){' '}
                        {c.sets.map((ps, i) => (
                          <span key={i}>
                            {ps.count} x {ps.weight}
                            <span className='text-gray-800 text-sm'>kg</span>
                            {i !== c.sets.length - 1 && <span className='px-1'>+</span>}
                          </span>
                        ))}{' '}
                        for a total dumbbell weight of {c.totalWeight}
                        <span className='text-gray-800 text-sm'>kg</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
