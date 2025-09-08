import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { login, parseM3U } from './src/api';
import { Video } from 'expo-av';

export default function App() {
  const [email,setEmail]=useState('demo@user.com')
  const [password,setPassword]=useState('demo123')
  const [token,setToken]=useState<string|null>(null)
  const [url,setUrl]=useState('')
  const [items,setItems]=useState<any[]>([])
  const [current,setCurrent]=useState<any|null>(null)

  const doLogin = async ()=>{
    const res = await login(email,password)
    setToken(res.access_token)
  }

  const load = async ()=>{
    const res = await parseM3U(url, token!)
    setItems(res)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IPTV One (Mobile)</Text>
      {!token ? (
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail}/>
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" secureTextEntry value={password} onChangeText={setPassword}/>
          <TouchableOpacity style={styles.btn} onPress={doLogin}><Text>Login</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={{width:'100%'}}>
          <View style={styles.card}>
            <TextInput style={styles.input} placeholder="M3U URL" placeholderTextColor="#999" value={url} onChangeText={setUrl}/>
            <TouchableOpacity style={styles.btn} onPress={load}><Text>Importer</Text></TouchableOpacity>
          </View>
          {current?.streamUrl && (
            <View style={styles.card}>
              <Text style={{marginBottom:8}}>{current.title}</Text>
              <Video source={{ uri: current.streamUrl }} useNativeControls style={{ width:'100%', height: 200, backgroundColor:'black' }} />
            </View>
          )}
          <FlatList
            data={items}
            keyExtractor={(it)=>it.externalId}
            numColumns={3}
            renderItem={({item})=>(
              <TouchableOpacity style={styles.cell} onPress={()=>setCurrent(item)}>
                <Image source={{ uri: item.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster' }} style={{ width:'100%', height: 150 }} />
                <Text numberOfLines={2} style={{fontSize:12, marginTop:4}}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', paddingTop: 40, gap: 12 },
  title: { color: 'white', fontSize: 20, fontWeight: '600' },
  card: { backgroundColor:'#171717', padding:12, borderRadius:12, width:'92%', gap:8 },
  input: { backgroundColor:'#262626', color:'white', padding:10, borderRadius:10 },
  btn: { backgroundColor:'#e5e5e5', padding:10, borderRadius:10, alignItems:'center' },
  cell: { width: '30%', margin: '1.66%' }
});
