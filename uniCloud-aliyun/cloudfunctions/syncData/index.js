'use strict'

const db = uniCloud.database()

exports.main = async (event, context) => {
  const clientInfo = context.CLIENTIP || 'local-user'
  const userId = event.userId || clientInfo
  const collection = db.collection('diaries')

  if (event.action === 'upload') {
    const existed = await collection.where({ user_id: userId }).get()
    const payload = {
      user_id: userId,
      diaries: event.diaries || [],
      updated_at: Date.now()
    }
    if (existed.data && existed.data.length) {
      await collection.doc(existed.data[0]._id).update(payload)
    } else {
      await collection.add(payload)
    }
    return {
      ok: true,
      count: payload.diaries.length
    }
  }

  const result = await collection.where({ user_id: userId }).limit(1).get()
  return {
    ok: true,
    diaries: result.data && result.data[0] ? result.data[0].diaries : []
  }
}
