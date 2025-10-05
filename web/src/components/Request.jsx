import React, { useEffect } from 'react'
import styles from '@styles/Request.module.css'

const Request = () => {
  async function umaRequisisao() {
    const stayHere = 'Eu estive por aqui'
    alert('Entrei')
    try {
      fetch('/api/hi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'algum valor' }),
      })
        .then((res) => {
          console.log('F-EDITPERF: Resposta da API:', res)
          if (!res.ok) {
            alert(`Erro na requisição`)
          }
          return res.json()
        })
        .then((data) => {
          console.log('Dados recebidos:', data)
        })
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className={styles.example} onClick={() => umaRequisisao()}>
      Request
    </div>
  )
}

export default Request