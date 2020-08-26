import * as React from 'react';
import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  Button,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar
} from 'react-native';
import { styles } from '../style/styles'
import QRCode from 'react-native-qrcode-svg';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { AntDesign } from '@expo/vector-icons'
import * as  SecureStore from "expo-secure-store";
import { API_HOST } from '../config';
const screenHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("window").width;

export default class QRScreen extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasPermission: null,
      scanned: false,
      index: 0
    }
  }
  componentDidMount() {
    BarCodeScanner.getPermissionsAsync()
      .then(status => {
        if (status == 'granted')
          console.log('kevi')
      })
  }
  handleSteps = ({ qrType, data }) => {
    try {
      let { type, deviceId } = JSON.parse(data)
      if (deviceId == this.state.carId & this.state.index == 1) {
        Alert.alert(
          'Hey!',
          'You can\'t use the same card for both items',
          [{
            text: 'ok',
            onPress: () => {
              this.setState({
                scanned: false
              })
            },
            style: 'cancel',
          }]
        )
      } else {
        SecureStore.getItemAsync('authtoken').then((token) => {
          fetch(`${API_HOST}/api/admin/device/${type}/${deviceId}`, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'authorization': token
            }
          })
            .then(res => res.json())
            .then(data => {
              let { success, msg } = data
              Alert.alert(
                'Hey!',
                success ? `Do you want to add ${deviceId} as ${this.state.index == 0 ? "car" : "key"} Card` : msg ? msg : 'Invalid Card!',
                success ? [
                  {
                    text: 'Cancel',
                    onPress: () => {
                      this.setState({
                        scanned: false
                      })
                    },
                    style: 'cancel',
                  },
                  {
                    text: 'Yes', onPress: () => {
                      this.setState({
                        index: this.state.index + 1,
                        scanned: false,
                        carId: this.state.index == 0 ? deviceId : this.state.carId,
                        keyId: this.state.index != 0 ? deviceId : this.state.keyId
                      })
                    }
                  },
                ] : [{
                  text: 'Ok',
                  onPress: () => {
                    this.setState({
                      scanned: false
                    })
                  },
                  style: 'cancel',
                }],
                { cancelable: false }
              )
            })
        })
      }
    } catch (e) {
    }
  }
  renderModal(index) {
    switch (index) {
      case 0:
      case 1:
        return (
          <View style={{ ...styles.modalView }}>
            <TouchableOpacity
              onPress={() => { this.props.closeModal(); this.setInitialState() }}
              style={{
                margin: 10,
                position: 'absolute',
                top: 10,
                right: 20,
                zIndex: 2
              }}
            >
              <Text><AntDesign name='close' size={20} color='#a1a1a1' /></Text>
            </TouchableOpacity>
            <Text style={styles.blueTitle} >Step {index + 1}</Text>
            <View style={{ ...styles.qrContainer, marginTop: 10 }}>
              <BarCodeScanner
                onBarCodeScanned={this.state.scanned ? undefined : (data) =>
                  this.setState({
                    scanned: true
                  }, this.handleSteps(data))}
                style={styles.QR}
              />
            </View>
            <Text style={styles.grayTextBold}>Please scan the Gps Card for the {this.state.index == 0 ? 'car' : 'key'}</Text>
          </View>
        )
      case 2:
        !this.state.qrDone ?
          this.setState({
            qrDone: true
          }, () => {
            SecureStore.getItemAsync('authtoken').then((token) => {
              fetch(`${API_HOST}/api/admin/trip/${this.state.carId}/${this.state.keyId}`, {
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'authorization': token
                }
              })
                .then(res => res.json())
                .then(data => {
                  let { success, qrData } = data
                  this.setState({
                    qrData
                  })
                  if (success)
                    this.props.createTrip(qrData)
                  this.props.askForLocationPermissions().then(console.log)
                })
            })
          }) : ''
        return (
          <View style={{ ...styles.modalView }}>
            <TouchableOpacity
              onPress={() => { this.props.closeModal(); this.setInitialState(); }}
              style={{
                margin: 10,
                position: 'absolute',
                top: 10,
                right: 20,
                zIndex: 2
              }}
            >
              <Text><AntDesign name='close' size={20} color='#a1a1a1' /></Text>
            </TouchableOpacity>
            <View style={{ ...styles.qrContainer, marginTop: 20, borderRadius: 5, alignItems: 'center', height: screenHeight * 0.7 }}>
              <Text style={styles.blueTitle}>New Trip</Text>
              <View style={{
                margin: 20,
                height: screenWidth
              }}>
                <QRCode
                  value={this.state.qrData}
                  size={screenWidth - 80}
                  color='black'
                />
                <Text
                  style={styles.grayTextBold}
                >{JSON.parse(this.state.qrData || '{}').tripId}</Text>
              </View>
            </View>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'nowrap',
              position: 'absolute',
              bottom: 20
            }}>
              <View
                style={{
                  ...styles.buttonBlue,
                  width: (screenWidth - 60) * 0.25,
                  marginRight: 10
                }}
              ><Text style={styles.buttonBlueText}><AntDesign name="copy1" size={16} color="white" /></Text></View>
              <View
                style={{
                  ...styles.buttonBlueLight,
                  width: (screenWidth - 60) * 0.75,
                }}
              ><Text style={styles.buttonBlueText}><AntDesign name="sharealt" size={16} color="white" /> Share</Text></View>
            </View>
          </View>
        )
    }
  }
  setInitialState() {
    this.setState({
      scanned: false,
      index: 0,
      carId: undefined,
      keyId: undefined,
      qrDone: false
    })
  }
  render() {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={this.props.modalState || false}
        onRequestClose={() => {
          this.props.closeModal(); this.setInitialState()
        }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="rgba(0,0,0,0.4)" />
        <View style={{
          ...styles.container,
          backgroundColor: 'rgba(0,0,0,0.4)'
        }}>
          {this.renderModal(this.state.index)}
        </View>
      </Modal>
    );
  }
}

