const Address = require('bcoin/lib/primitives/address')
    , KeyRing = require('bcoin/lib/primitives/keyring')
    , Script  = require('bcoin/lib/script/script')
    , MTX     = require('bcoin/lib/primitives/mtx')
    , Coin    = require('bcoin/lib/primitives/coin')
    , Amount  = require('bcoin/lib/btc/amount')
    , uniq    = xs => Object.keys(xs.reduce((o, v) => (o[v]=1,o), {})) // @XXX works on strings only

require('./patch-bcoin-bcash')

module.exports = (inputs, outputs, feerate) => {
  const tx    = MTX.fromOptions({ version: 1 })
      , coins = inputs.map(makeCoin)
      , keys  = uniq(inputs.map(input => input.key)).map(key => KeyRing.fromSecret(key))
      , isALL = (outputs.length == 1 && outputs[0].value == 'ALL')

  if (isALL) outputs[0].value = coins.reduce((t, c) => t + c.value, 0) // @XXX side effect

  coins  .forEach(coin   => tx.addCoin(coin))
  outputs.forEach(output => tx.addOutput(output))

  if (isALL && feerate) {
    // sign a cloned copy of the tx to figure out its size and fee, then substractFee() and re-sign
    const txTmp = tx.clone()
    txTmp.view = tx.view
    keys.forEach(key => txTmp.sign(key))
    tx.subtractFee(txTmp.getMinFee(null, feerate*1000)) // we take feerate as sat/b, underlying bcoin uses sat/kb
  }

  keys.forEach(key => tx.sign(key))

  return tx
}

const keyAddrScript = key => Script.fromAddress(KeyRing.fromSecret(key).getAddress())
    , makeCoin      = inv => Coin.fromOptions({ hash: revHex(inv.hash), index: inv.index, value: inv.value, script: keyAddrScript(inv.key) })
    , revHex        = hex => hex.match(/../g).reverse().join('')
